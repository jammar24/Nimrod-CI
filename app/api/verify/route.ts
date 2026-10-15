import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyPatchToCode } from '@/lib/diffutil';
import { checkSyntax } from '@/lib/syntax';
import { callNemotronJson, getModelConfig } from '@/lib/llm';
import { FindingSchema, PatchSchema, VerificationSchema, Verification } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizeUntrustedDiff } from '@/lib/prompts';
import { getValidatedEnv } from '@/lib/env';

export const maxDuration = 45;

const VerifyRequestSchema = z.object({
  finding: FindingSchema,
  patch: PatchSchema,
  originalCode: z.string().max(50000),
  language: z.string().max(50).optional().default('javascript'),
  iteration: z.number().int().min(1).max(5).default(1),
});

const ReanalysisSchema = z.object({
  resolved: z.boolean(),
  notes: z.string(),
});

const VERIFY_REANALYSIS_SYSTEM_PROMPT = `You are NIMROD-CI Automated Verification Engine.
Your task is to re-analyze patched source code to determine if the specific reported security vulnerability has been completely eliminated.

RULES:
1. Compare the patched code against the reported vulnerability.
2. If the vulnerability is genuinely fixed (e.g. parameterized queries replacing SQL concatenation, secrets removed, HTML escaped, safe paths asserted), set "resolved": true.
3. If the vulnerability still exists, or if a new obvious vulnerability was introduced, set "resolved": false and explain why in "notes".
4. Output ONLY valid JSON matching:
{
  "resolved": boolean,
  "notes": "string explanation of verification decision"
}
Do not write markdown fences or conversational text.`;

export async function POST(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimit(req);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.reason || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = VerifyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { finding, patch, originalCode, language, iteration } = parsed.data;

    // Server-side cap on agentic retry iterations (cannot be bypassed by the client)
    const env = getValidatedEnv();
    const maxIterations = env.MAX_VERIFY_ITERATIONS;
    if (iteration > maxIterations) {
      return NextResponse.json(
        { error: `Iteration ${iteration} exceeds server-side limit of ${maxIterations} iterations.` },
        { status: 422 }
      );
    }

    // STEP 1: Apply unified diff patch to original code
    const patchResult = applyPatchToCode(
      originalCode,
      patch.unifiedDiff,
      patch.patchedCode
    );

    if (!patchResult.success) {
      return NextResponse.json({
        verification: {
          findingId: finding.id,
          syntaxOk: false,
          resolved: false,
          iterations: iteration,
          notes: `Patch application failed: ${patchResult.error || 'Diff does not match context lines.'}`,
        },
      });
    }

    const codeToVerify = patchResult.patchedCode;

    // STEP 2: Syntax Validation (acorn for JS, typescript compiler for TS)
    const syntaxResult = checkSyntax(codeToVerify, language);
    if (!syntaxResult.valid) {
      return NextResponse.json({
        verification: {
          findingId: finding.id,
          syntaxOk: false,
          resolved: false,
          iterations: iteration,
          notes: `Syntax error in patched code: ${syntaxResult.error}`,
          syntaxEngine: syntaxResult.engineUsed,
          verificationMethod: syntaxResult.engineUsed === 'none' ? 'model_only' : 'compiler_plus_model',
        },
      });
    }

    // STEP 3: Model Re-Analysis using Fast Nemotron Model
    const { fast: modelFast } = getModelConfig();

    const safeSnippet = sanitizeUntrustedDiff(finding.vulnerableSnippet);
    const safePatchedCode = sanitizeUntrustedDiff(codeToVerify);

    const userPrompt = `Vulnerability to verify:
- Title: ${finding.title}
- CWE: ${finding.cwe || 'Unknown'}
- Original Vulnerable Snippet:
${safeSnippet}

<<<PATCHED_CODE_START>>>
${safePatchedCode}
<<<PATCHED_CODE_END>>>

Has this security vulnerability been completely resolved? Return ONLY JSON with "resolved" and "notes".`;

    const reanalysis = await callNemotronJson({
      model: modelFast,
      systemPrompt: VERIFY_REANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      schema: ReanalysisSchema,
      temperature: 0.05,
      maxTokens: 1000,
    });

    const isResolved = reanalysis.data.resolved;
    const notes = reanalysis.data.notes;
    const verificationMethod: Verification['verificationMethod'] =
      syntaxResult.engineUsed === 'none' ? 'model_only' : 'compiler_plus_model';

    const verification: Verification = {
      findingId: finding.id,
      syntaxOk: true,
      resolved: isResolved,
      iterations: iteration,
      notes,
      syntaxEngine: syntaxResult.engineUsed,
      verificationMethod,
    };

    return NextResponse.json({
      verification,
      telemetry: {
        modelUsed: reanalysis.modelUsed,
        durationMs: reanalysis.durationMs,
        tokens: reanalysis.tokens,
        hadCorrectiveRetry: reanalysis.hadCorrectiveRetry,
      },
    });
  } catch (error: any) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error during patch verification',
      },
      { status: 500 }
    );
  }
}

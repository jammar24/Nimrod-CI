import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyPatchToCode, checkPatchConsistency } from '@/lib/diffutil';
import { checkSyntax } from '@/lib/syntax';
import { callNemotronJson, getModelConfig } from '@/lib/llm';
import { FindingSchema, PatchSchema, Verification } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizeUntrustedDiff, VERIFY_REANALYSIS_SYSTEM_PROMPT } from '@/lib/prompts';
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

    // STEP 0: Consistency check (language and file path of patch must match analyzed finding)
    const consistency = checkPatchConsistency(finding, patch, language, originalCode);
    if (!consistency.valid) {
      return NextResponse.json({
        verification: {
          findingId: finding.id,
          syntaxOk: false,
          resolved: false,
          iterations: iteration,
          notes: `Patch consistency check failed: ${consistency.reason}`,
          syntaxEngine: 'none',
          verificationMethod: 'model_only',
          consistencyOk: false,
        },
      });
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

    const userPrompt = `Target File: ${finding.file}
Vulnerability to verify:
- Title: ${finding.title}
- CWE: ${finding.cwe || 'Unknown'}
- Original Vulnerable Snippet:
${safeSnippet}

<<<PATCHED_CODE_START>>>
${safePatchedCode}
<<<PATCHED_CODE_END>>>

Question: Does the patched code still contain the original weakness OR any new security weakness introduced by the patch? List any (CWE and line).
If the answer lists any weakness (including eval, new Function, shell=True, command execution, or unresolved flaw), verification fails: set "resolved": false and state the weakness with CWE and line in "notes".
Return ONLY valid JSON with "resolved" and "notes".`;

    const reanalysis = await callNemotronJson({
      model: modelFast,
      systemPrompt: VERIFY_REANALYSIS_SYSTEM_PROMPT,
      userPrompt,
      schema: ReanalysisSchema,
      temperature: 0.05,
      maxTokens: 2000,
    });

    // Hard rule: if the patched code executes untrusted input via eval/new Function/shell=True, reject immediately
    let isResolved = reanalysis.data.resolved;
    let notes = reanalysis.data.notes;

    const containsDangerousDynamicExec =
      /\beval\s*\(/.test(codeToVerify) ||
      /\bnew\s+Function\s*\(/.test(codeToVerify) ||
      /shell\s*=\s*True/.test(codeToVerify);

    if (containsDangerousDynamicExec) {
      isResolved = false;
      const violationDetail = /\beval\s*\(/.test(codeToVerify)
        ? 'Patched code introduces forbidden dynamic evaluation: eval() detected (CWE-95)'
        : /\bnew\s+Function\s*\(/.test(codeToVerify)
        ? 'Patched code introduces forbidden dynamic code execution: new Function() detected (CWE-95)'
        : 'Patched code introduces forbidden command execution: shell=True detected (CWE-78)';
      notes = notes ? `${violationDetail}. Model note: ${notes}` : violationDetail;
    }

    const verificationMethod: Verification['verificationMethod'] =
      syntaxResult.engineUsed === 'none' ? 'model_only' : 'compiler_plus_model';

    const combinedNotes = syntaxResult.notes ? `${syntaxResult.notes}. ${notes}` : notes;

    const verification: Verification = {
      findingId: finding.id,
      syntaxOk: true,
      resolved: isResolved,
      iterations: iteration,
      notes: combinedNotes,
      syntaxEngine: syntaxResult.engineUsed,
      verificationMethod,
      consistencyOk: true,
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
  } catch (error) {
    console.error('Verify endpoint error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Internal server error during patch verification',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callNemotronJson, getModelConfig } from '@/lib/llm';
import { FindingSchema, PatchSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizeUntrustedDiff, PATCH_SYSTEM_PROMPT } from '@/lib/prompts';
import { ensureDiffHeaderHasRealPath } from '@/lib/diffutil';

export const maxDuration = 60;

const PatchRequestSchema = z.object({
  finding: FindingSchema,
  originalCode: z.string().min(1, 'Original code is required').max(50000, 'Original code exceeds maximum allowed size'),
  language: z.string().max(50).optional().default('javascript'),
  feedback: z.string().max(4000, 'Feedback exceeds 4000 characters limit').optional(),
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
    const parsed = PatchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { finding, originalCode, language, feedback } = parsed.data;
    const { primary: modelPrimary } = getModelConfig();

    const safeFeedback = feedback ? sanitizeUntrustedDiff(feedback) : '';
    const safeSnippet = sanitizeUntrustedDiff(finding.vulnerableSnippet);
    const safeOriginalCode = sanitizeUntrustedDiff(originalCode);

    const feedbackSection = safeFeedback
      ? `\n⚠️ PREVIOUS ATTEMPT FAILED VERIFICATION:\n${safeFeedback}\nPlease correct this mistake in your new patch.\n`
      : '';

    const userPrompt = `Target Language: ${language}
Target File: ${finding.file}
Finding to remediate:
- ID: ${finding.id}
- Title: ${finding.title}
- CWE: ${finding.cwe || 'Unknown'}
- Vulnerable Snippet: ${safeSnippet}
- Explanation: ${finding.explanation}
${feedbackSection}
<<<ORIGINAL_SOURCE_CODE_START>>>
${safeOriginalCode}
<<<ORIGINAL_SOURCE_CODE_END>>>

Write the minimal security patch.
HARD SAFETY RULES:
- Never propose eval, new Function, exec/execSync with interpolated input, shell=True, or any construct that executes untrusted input as code.
- Prefer allow-lists, parsing (e.g. safe expression parser), or removing dynamic evaluation. If no safe fix exists, propose removing dynamic evaluation instead of inventing a "safe" eval.
- In unifiedDiff header, use the exact real file path: --- a/${finding.file} and +++ b/${finding.file}.

Return strictly valid JSON matching the Patch schema with findingId="${finding.id}".`;

    const result = await callNemotronJson({
      model: modelPrimary,
      systemPrompt: PATCH_SYSTEM_PROMPT,
      userPrompt,
      schema: PatchSchema,
      temperature: 0.05,
      // Nemotron spends tokens "thinking" before emitting JSON; a low budget
      // truncates the unifiedDiff/patchedCode strings mid-JSON (Unterminated string).
      maxTokens: 6000,
    });

    const patchData = {
      ...result.data,
      unifiedDiff: ensureDiffHeaderHasRealPath(result.data.unifiedDiff, finding.file),
    };

    return NextResponse.json({
      patch: patchData,
      telemetry: {
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        tokens: result.tokens,
        hadCorrectiveRetry: result.hadCorrectiveRetry,
      },
    });
  } catch (error) {
    console.error('Patch endpoint error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Internal server error during patch generation',
      },
      { status: 500 }
    );
  }
}

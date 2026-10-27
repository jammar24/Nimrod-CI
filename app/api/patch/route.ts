import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callNemotronJson, getModelConfig } from '@/lib/llm';
import { FindingSchema, PatchSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizeUntrustedDiff, PATCH_SYSTEM_PROMPT } from '@/lib/prompts';
import { ensureDiffHeaderHasRealPath, getCondensedCodeContext } from '@/lib/diffutil';
import { sanitizeServerLog, isTimeoutOrGatewayError } from '@/lib/logging';

// Hobby plan + Fluid Compute: maximum allowed duration is 300 s.
export const maxDuration = 300;

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

    // Condense source context: center the window around the vulnerable snippet
    // to reduce prompt size and model generation time without losing the fix target.
    const condensedCode = getCondensedCodeContext(originalCode, finding.vulnerableSnippet, 60);
    const safeOriginalCode = sanitizeUntrustedDiff(condensedCode);

    const feedbackSection = safeFeedback
      ? `\n⚠️ PREVIOUS ATTEMPT FAILED VERIFICATION:\n${safeFeedback}\nPlease correct this mistake in your new patch.\n`
      : '';

    const buildUserPrompt = (includeFullCode: boolean) => {
      const codeBlock = includeFullCode
        ? `<<<ORIGINAL_SOURCE_CODE_START>>>\n${safeOriginalCode}\n<<<ORIGINAL_SOURCE_CODE_END>>>`
        : `Vulnerable snippet only (full file unavailable on retry):\n${safeSnippet}`;

      return `Target Language: ${language}
Target File: ${finding.file}
Finding to remediate:
- ID: ${finding.id}
- Title: ${finding.title}
- CWE: ${finding.cwe || 'Unknown'}
- Vulnerable Snippet: ${safeSnippet}
- Explanation: ${finding.explanation}
${feedbackSection}
${codeBlock}

Write the minimal security patch. Keep unifiedDiff and patchedCode compact.
HARD SAFETY RULES:
- Never propose eval, new Function, exec/execSync with interpolated input, shell=True, or any construct that executes untrusted input as code.
- Prefer allow-lists, parsing, or removing dynamic evaluation entirely.
- In unifiedDiff header, use the exact real file path: --- a/${finding.file} and +++ b/${finding.file}.

Return strictly valid JSON matching the Patch schema with findingId="${finding.id}".`;
    };

    /**
     * Call the LLM and retry once on 504 / timeout with a shorter prompt.
     * reasoning_effort 'low' is the least expensive setting the OpenAI-compatible
     * API supports, reducing thinking-token overhead while still producing a valid diff.
     */
    const callPatch = async (includeFullCode: boolean) =>
      callNemotronJson({
        model: modelPrimary,
        systemPrompt: PATCH_SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(includeFullCode),
        schema: PatchSchema,
        temperature: 0.05,
        maxTokens: 2800,
        reasoningEffort: 'low',
      });

    let result;
    try {
      result = await callPatch(true);
    } catch (firstError: unknown) {
      if (isTimeoutOrGatewayError(firstError)) {
        console.error(
          '[patch] First attempt timed out, retrying with shorter prompt. Cause:',
          sanitizeServerLog(firstError)
        );
        // Retry once with only the snippet, not the full code window
        result = await callPatch(false);
      } else {
        throw firstError;
      }
    }

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
    const isTimeout = isTimeoutOrGatewayError(error);
    console.error(
      '[patch] Endpoint error (type=%s):',
      isTimeout ? 'timeout/504' : 'other',
      sanitizeServerLog(error)
    );
    const status = isTimeout ? 504 : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Internal server error during patch generation',
      },
      { status }
    );
  }
}

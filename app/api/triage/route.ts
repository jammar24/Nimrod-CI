import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callNemotronJson, getModelConfig } from '@/lib/llm';
import { TRIAGE_SYSTEM_PROMPT, formatTriageUserPrompt } from '@/lib/prompts';
import { TriageResultSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';

export const maxDuration = 120; // Hobby + Fluid Compute: raised from 30 s

const TriageRequestSchema = z.object({
  diff: z.string().min(1, 'Diff cannot be empty').max(20000, 'Diff exceeds 20000 characters limit'),
  language: z.string().max(50).optional().default('auto'),
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
    const parsed = TriageRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { diff, language } = parsed.data;
    const { fast: modelFast, maxDiffChars } = getModelConfig();

    if (diff.length > maxDiffChars) {
      return NextResponse.json(
        {
          error: `Diff size (${diff.length} chars) exceeds maximum allowed limit (${maxDiffChars} chars).`,
        },
        { status: 413 }
      );
    }

    const userPrompt = formatTriageUserPrompt(diff, language);

    const result = await callNemotronJson({
      model: modelFast,
      systemPrompt: TRIAGE_SYSTEM_PROMPT,
      userPrompt,
      schema: TriageResultSchema,
      temperature: 0.1,
      maxTokens: 1024,
    });

    return NextResponse.json({
      language: result.data.language || language || 'auto',
      riskyHunks: result.data.riskyHunks,
      telemetry: {
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        tokens: result.tokens,
        hadCorrectiveRetry: result.hadCorrectiveRetry,
      },
    });
  } catch (error) {
    console.error('Triage endpoint error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Internal server error during triage execution',
      },
      { status: 500 }
    );
  }
}

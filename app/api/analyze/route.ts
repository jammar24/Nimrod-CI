import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callNemotronJson, getModelConfig } from '@/lib/llm';
import { ANALYZE_SYSTEM_PROMPT, formatAnalyzeUserPrompt } from '@/lib/prompts';
import { AnalyzeResultSchema, RiskyHunkSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';
import { assembleReport } from '@/lib/report';

export const maxDuration = 60; // Up to 60s for deep SAST reasoning

const AnalyzeRequestSchema = z.object({
  diff: z.string().min(1, 'Diff cannot be empty').max(20000, 'Diff exceeds maximum allowed limit'),
  language: z.string().max(50).optional().default('auto'),
  riskyHunks: z.array(RiskyHunkSchema).max(50).optional(),
  fullPipeline: z.boolean().optional().default(false),
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
    const parsed = AnalyzeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { diff, language, riskyHunks, fullPipeline } = parsed.data;
    const { primary: modelPrimary, maxDiffChars } = getModelConfig();

    if (diff.length > maxDiffChars) {
      return NextResponse.json(
        {
          error: `Diff size (${diff.length} chars) exceeds maximum allowed limit (${maxDiffChars} chars).`,
        },
        { status: 413 }
      );
    }

    const userPrompt = formatAnalyzeUserPrompt(diff, language, riskyHunks);

    const result = await callNemotronJson({
      model: modelPrimary,
      systemPrompt: ANALYZE_SYSTEM_PROMPT,
      userPrompt,
      schema: AnalyzeResultSchema,
      temperature: 0.1,
      maxTokens: 4000,
    });

    const responsePayload: Record<string, unknown> = {
      findings: result.data.findings,
      telemetry: {
        modelUsed: result.modelUsed,
        durationMs: result.durationMs,
        tokens: result.tokens,
        hadCorrectiveRetry: result.hadCorrectiveRetry,
      },
    };

    if (fullPipeline) {
      responsePayload.report = assembleReport({
        findings: result.data.findings,
        patches: [],
        verifications: [],
        durationMs: result.durationMs,
      });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Analyze endpoint error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Internal server error during analysis execution',
      },
      { status: 500 }
    );
  }
}

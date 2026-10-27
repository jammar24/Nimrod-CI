import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { enrichFindingsWithTavily } from '@/lib/enrich';
import { FindingSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/ratelimit';

export const maxDuration = 120; // Hobby + Fluid Compute: raised from 30 s

const EnrichRequestSchema = z.object({
  findings: z.array(FindingSchema),
  language: z.string().optional().default('javascript'),
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
    const parsed = EnrichRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { findings, language } = parsed.data;

    const enriched = await enrichFindingsWithTavily({
      findings,
      language,
    });

    return NextResponse.json({
      findings: enriched,
    });
  } catch (error) {
    console.error('Enrich endpoint error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Internal server error during search enrichment',
      },
      { status: 500 }
    );
  }
}

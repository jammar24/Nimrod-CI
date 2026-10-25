import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  parseGitHubPrUrl,
  fetchGitHubPr,
  createGitHubPullRequest,
  CreatePrPayload,
} from '@/lib/github';
import { checkRateLimit } from '@/lib/ratelimit';

export const maxDuration = 30;

// Strict allow-list for GitHub repo components used in API URL interpolation
const RepoComponentSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_.-]+$/, 'contains characters not allowed in a GitHub repository name');

const FetchPrBodySchema = z.object({
  action: z.literal('fetch-pr'),
  prUrl: z.string().min(1).max(300),
  token: z.string().min(1).max(200).optional(),
});

const CreatePrBodySchema = z.object({
  action: z.literal('create-pr'),
  owner: RepoComponentSchema.max(100),
  repo: RepoComponentSchema.max(100),
  baseBranch: z.string().max(300).default('main'),
  newBranch: z.string().max(300).optional(),
  filePath: z.string().min(1).max(500),
  patchedContent: z.string().min(1).max(50000),
  commitMessage: z.string().max(500).optional(),
  prTitle: z.string().max(300).optional(),
  prBody: z.string().max(5000).optional(),
  token: z.string().min(1).max(200),
});

/** Safely extracts message and HTTP status from an unknown thrown error. */
function describeError(error: unknown, fallback: string): { message: string; status: number } {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined;
  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message) || fallback
          : fallback,
    status: typeof status === 'number' && status >= 400 && status <= 599 ? status : 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const rateCheck = await checkRateLimit(req);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.reason || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const prUrl = searchParams.get('url') || searchParams.get('prUrl');
    // Security: only accept the PAT via Authorization header. Query parameters
    // would leak the token into access logs, proxies and browser history.
    const token =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || undefined;

    if (!prUrl) {
      return NextResponse.json(
        { error: 'Missing or invalid "url" or "prUrl" query parameter' },
        { status: 400 }
      );
    }

    const prRef = parseGitHubPrUrl(prUrl);
    const prDetails = await fetchGitHubPr(prRef, token);
    return NextResponse.json({ success: true, data: prDetails });
  } catch (error) {
    const described = describeError(error, 'GitHub PR fetch failed');
    return NextResponse.json(
      { error: described.message },
      { status: described.status || 400 }
    );
  }
}

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
    const { action } = body;

    if (action === 'fetch-pr') {
      const bodyParsed = FetchPrBodySchema.safeParse({ ...body, action: 'fetch-pr' });
      if (!bodyParsed.success) {
        return NextResponse.json(
          { error: 'Missing or invalid "prUrl" parameter' },
          { status: 400 }
        );
      }

      const { prUrl } = bodyParsed.data;
      // Header takes precedence; body token kept for backward compatibility
      const token =
        req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
        bodyParsed.data.token ||
        undefined;

      let prRef;
      try {
        prRef = parseGitHubPrUrl(prUrl);
      } catch (err) {
        return NextResponse.json(
          { error: (err instanceof Error && err.message) || 'Invalid GitHub PR URL' },
          { status: 400 }
        );
      }

      const prDetails = await fetchGitHubPr(prRef, token);
      return NextResponse.json({ success: true, data: prDetails });
    }

    if (action === 'create-pr') {
      const bodyParsed = CreatePrBodySchema.safeParse({ ...body, action: 'create-pr' });
      if (!bodyParsed.success) {
        return NextResponse.json(
          {
            error: 'Invalid create-pr payload',
            details: bodyParsed.error.format(),
          },
          { status: 400 }
        );
      }

      const payload: CreatePrPayload = {
        owner: bodyParsed.data.owner,
        repo: bodyParsed.data.repo,
        baseBranch: bodyParsed.data.baseBranch,
        newBranch: bodyParsed.data.newBranch,
        filePath: bodyParsed.data.filePath,
        patchedContent: bodyParsed.data.patchedContent,
        commitMessage: bodyParsed.data.commitMessage,
        prTitle: bodyParsed.data.prTitle,
        prBody: bodyParsed.data.prBody,
        // Header takes precedence; body token kept for backward compatibility
        token:
          req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
          bodyParsed.data.token,
      };

      const result = await createGitHubPullRequest(payload);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { error: `Unknown action: "${action}". Valid actions are: "fetch-pr", "create-pr"` },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API /api/github] Error:', error);
    const described = describeError(error, 'GitHub operation failed');
    return NextResponse.json(
      { error: described.message },
      { status: described.status || 500 }
    );
  }
}

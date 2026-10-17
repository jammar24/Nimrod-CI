import { NextRequest, NextResponse } from 'next/server';
import {
  parseGitHubPrUrl,
  fetchGitHubPr,
  createGitHubPullRequest,
  CreatePrPayload,
} from '@/lib/github';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prUrl = searchParams.get('url') || searchParams.get('prUrl');
    const token =
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      searchParams.get('token') ||
      undefined;

    if (!prUrl) {
      return NextResponse.json(
        { error: 'Missing or invalid "url" or "prUrl" query parameter' },
        { status: 400 }
      );
    }

    const prRef = parseGitHubPrUrl(prUrl);
    const prDetails = await fetchGitHubPr(prRef, token);
    return NextResponse.json({ success: true, data: prDetails });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'GitHub PR fetch failed' },
      { status: error.status || 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'fetch-pr') {
      const { prUrl, token } = body;
      if (!prUrl || typeof prUrl !== 'string') {
        return NextResponse.json(
          { error: 'Missing or invalid "prUrl" parameter' },
          { status: 400 }
        );
      }

      let prRef;
      try {
        prRef = parseGitHubPrUrl(prUrl);
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message || 'Invalid GitHub PR URL' },
          { status: 400 }
        );
      }

      const prDetails = await fetchGitHubPr(prRef, token);
      return NextResponse.json({ success: true, data: prDetails });
    }

    if (action === 'create-pr') {
      const payload: CreatePrPayload = {
        owner: body.owner,
        repo: body.repo,
        baseBranch: body.baseBranch || 'main',
        newBranch: body.newBranch,
        filePath: body.filePath,
        patchedContent: body.patchedContent,
        commitMessage: body.commitMessage,
        prTitle: body.prTitle,
        prBody: body.prBody,
        token: body.token,
      };

      if (!payload.owner || !payload.repo || !payload.filePath || !payload.patchedContent) {
        return NextResponse.json(
          {
            error:
              'Missing required fields: owner, repo, filePath, and patchedContent are mandatory.',
          },
          { status: 400 }
        );
      }

      const result = await createGitHubPullRequest(payload);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { error: `Unknown action: "${action}". Valid actions are: "fetch-pr", "create-pr"` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API /api/github] Error:', error);
    return NextResponse.json(
      { error: error.message || 'GitHub operation failed' },
      { status: error.status || 500 }
    );
  }
}

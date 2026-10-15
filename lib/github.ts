/**
 * GitHub API Integration for NIMROD-CI
 * Handles fetching Pull Request diffs/files and autonomously creating Pull Requests with verified patches.
 */

export interface GitHubPrRef {
  owner: string;
  repo: string;
  pullNumber: number;
}

export interface GitHubPrFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  rawUrl?: string;
}

export interface GitHubPrDetails {
  owner: string;
  repo: string;
  pullNumber: number;
  title: string;
  body: string;
  author: string;
  state: string;
  baseBranch: string;
  headBranch: string;
  htmlUrl: string;
  diff: string;
  files: GitHubPrFile[];
  primaryFile?: {
    filename: string;
    language: string;
    content: string;
  };
}

export interface CreatePrPayload {
  owner: string;
  repo: string;
  baseBranch: string;
  newBranch?: string;
  filePath: string;
  patchedContent: string;
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  token?: string;
}

export interface CreatePrResult {
  success: boolean;
  prUrl: string;
  prNumber: number;
  prTitle: string;
  branch: string;
  owner: string;
  repo: string;
}

/**
 * Parses a GitHub PR URL into owner, repo, and pull number.
 * Supports:
 * - https://github.com/owner/repo/pull/123
 * - https://github.com/owner/repo/pull/123/files
 * - owner/repo/pull/123
 * - owner/repo#123
 */
export function parseGitHubPrUrl(input: string): GitHubPrRef {
  const trimmed = input.trim();
  
  // Try full URL format
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/i
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/i, ''),
      pullNumber: parseInt(urlMatch[3], 10),
    };
  }

  // Try owner/repo#123 shorthand
  const shorthandMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)#(\d+)$/);
  if (shorthandMatch) {
    return {
      owner: shorthandMatch[1],
      repo: shorthandMatch[2],
      pullNumber: parseInt(shorthandMatch[3], 10),
    };
  }

  // Try owner/repo/pull/123 without domain
  const pathMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)$/i);
  if (pathMatch) {
    return {
      owner: pathMatch[1],
      repo: pathMatch[2],
      pullNumber: parseInt(pathMatch[3], 10),
    };
  }

  throw new Error(
    `Invalid GitHub Pull Request URL. Expected format: https://github.com/owner/repo/pull/123 or owner/repo#123`
  );
}

/**
 * Infer programming language from a filename
 */
export function detectLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
    default:
      return 'javascript';
  }
}

/**
 * Fetch Pull Request metadata, diff, and modified files from GitHub REST API
 */
export async function fetchGitHubPr(
  prRef: GitHubPrRef,
  token?: string
): Promise<GitHubPrDetails> {
  const { owner, repo, pullNumber } = prRef;
  const headers: Record<string, string> = {
    'User-Agent': 'NIMROD-CI-Autonomous-Security-Reviewer',
  };

  const authToken = token;
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  // 1. Fetch PR metadata
  const metaRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      headers: {
        ...headers,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error(
        `Pull Request #${pullNumber} not found in ${owner}/${repo}. Check if the repository is private (provide a GitHub token) or if the URL is correct.`
      );
    }
    if (metaRes.status === 403 || metaRes.status === 429) {
      const resetTime = metaRes.headers.get('x-ratelimit-reset');
      const resetMsg = resetTime ? ` Rate limit resets at ${new Date(parseInt(resetTime, 10) * 1000).toLocaleTimeString()}.` : '';
      throw new Error(`GitHub API rate limit exceeded.${resetMsg} Provide a GitHub Personal Access Token to increase the limit.`);
    }
    const errBody = await metaRes.text().catch(() => '');
    throw new Error(`GitHub API error (${metaRes.status}): ${errBody || metaRes.statusText}`);
  }

  const metaData = await metaRes.json();

  // 2. Fetch unified diff
  const diffRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`,
    {
      headers: {
        ...headers,
        Accept: 'application/vnd.github.v3.diff',
      },
    }
  );

  const diffText = diffRes.ok ? await diffRes.text() : '';

  // 3. Fetch list of modified files
  const filesRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=30`,
    {
      headers: {
        ...headers,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  const rawFiles: any[] = filesRes.ok ? await filesRes.json() : [];
  const files: GitHubPrFile[] = rawFiles.map((f: any) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
    changes: f.changes,
    patch: f.patch,
    rawUrl: f.raw_url,
  }));

  // Identify primary code file (prefer JS/TS/PY files)
  const codeExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.mjs', '.cjs'];
  const primaryCodeFile =
    files.find((f) => codeExts.some((ext) => f.filename.toLowerCase().endsWith(ext))) ||
    files[0];

  let primaryFile: GitHubPrDetails['primaryFile'] | undefined = undefined;

  if (primaryCodeFile) {
    let content = '';
    // Fetch raw baseline file content if available
    if (primaryCodeFile.rawUrl) {
      try {
        const rawRes = await fetch(primaryCodeFile.rawUrl, { headers });
        if (rawRes.ok) {
          content = await rawRes.text();
        }
      } catch {
        // Soft fallback
      }
    }

    primaryFile = {
      filename: primaryCodeFile.filename,
      language: detectLanguageFromFilename(primaryCodeFile.filename),
      content,
    };
  }

  return {
    owner,
    repo,
    pullNumber,
    title: metaData.title || `PR #${pullNumber}`,
    body: metaData.body || '',
    author: metaData.user?.login || 'unknown',
    state: metaData.state || 'open',
    baseBranch: metaData.base?.ref || 'main',
    headBranch: metaData.head?.ref || 'feature',
    htmlUrl: metaData.html_url || `https://github.com/${owner}/${repo}/pull/${pullNumber}`,
    diff: diffText,
    files,
    primaryFile,
  };
}

/**
 * Autonomously create a Pull Request on GitHub with the verified security patch
 */
export async function createGitHubPullRequest(
  payload: CreatePrPayload
): Promise<CreatePrResult> {
  const {
    owner,
    repo,
    baseBranch,
    filePath,
    patchedContent,
    commitMessage = 'security: apply verified Nimrod-CI patch',
    prTitle = '[Nimrod-CI] Autonomous Security Patch',
    prBody = '### Nimrod-CI Automated Security Patch\n\nThis pull request contains a verified security patch synthesized by Nimrod-CI.',
  } = payload;

  const token = payload.token;
  if (!token) {
    throw new Error(
      'GitHub Personal Access Token (PAT) is required from visitor to create a Pull Request. Provide a PAT with repo write permissions.'
    );
  }

  const headers: Record<string, string> = {
    'User-Agent': 'NIMROD-CI-Autonomous-Security-Reviewer',
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim().replace(/\.git$/i, '');
  const cleanFilePath = filePath.trim().replace(/^\/+/, '');

  // 1. Get base branch commit SHA
  const baseRefRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/git/ref/heads/${baseBranch.trim()}`,
    { headers }
  );

  if (!baseRefRes.ok) {
    if (baseRefRes.status === 404) {
      throw new Error(`Base branch '${baseBranch}' was not found in ${cleanOwner}/${cleanRepo}.`);
    }
    const errText = await baseRefRes.text();
    throw new Error(`Failed to resolve base branch '${baseBranch}': ${errText}`);
  }

  const baseRefData = await baseRefRes.json();
  const baseSha = baseRefData.object?.sha;
  if (!baseSha) {
    throw new Error(`Unable to determine commit SHA for base branch '${baseBranch}'.`);
  }

  // 2. Generate new branch name
  const timestamp = Date.now().toString(36);
  const cleanBranchSlug = (payload.newBranch || `NIMROD-CI/fix-${timestamp}`)
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, '-');
  let targetBranch = cleanBranchSlug;

  // Create new branch reference with collision recovery
  let createRefRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/git/refs`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${targetBranch}`,
        sha: baseSha,
      }),
    }
  );

  if (createRefRes.status === 422) {
    // Branch exists: append unique random suffix
    targetBranch = `${cleanBranchSlug}-${Math.random().toString(36).substring(2, 6)}`;
    createRefRes = await fetch(
      `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/git/refs`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${targetBranch}`,
          sha: baseSha,
        }),
      }
    );
  }

  if (!createRefRes.ok) {
    const refErr = await createRefRes.text();
    throw new Error(`Failed to create branch '${targetBranch}': ${refErr}`);
  }

  // 3. Check if file already exists on this new branch to obtain its SHA (required by GitHub contents API for updates)
  let existingSha: string | undefined = undefined;
  const getFileRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${cleanFilePath}?ref=${targetBranch}`,
    { headers }
  );

  if (getFileRes.ok) {
    const fileData = await getFileRes.json();
    existingSha = fileData.sha;
  }

  // 4. Update / create file with patched content
  const base64Content = Buffer.from(patchedContent, 'utf8').toString('base64');
  const putFileRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/contents/${cleanFilePath}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        branch: targetBranch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    }
  );

  if (!putFileRes.ok) {
    const putErr = await putFileRes.text();
    throw new Error(`Failed to commit patched file to branch '${targetBranch}': ${putErr}`);
  }

  // 5. Open Pull Request
  const createPrRes = await fetch(
    `https://api.github.com/repos/${cleanOwner}/${cleanRepo}/pulls`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: prTitle,
        head: targetBranch,
        base: baseBranch,
        body: prBody,
      }),
    }
  );

  if (!createPrRes.ok) {
    const prErr = await createPrRes.text();
    throw new Error(`Failed to create Pull Request: ${prErr}`);
  }

  const prData = await createPrRes.json();

  return {
    success: true,
    prUrl: prData.html_url,
    prNumber: prData.number,
    prTitle: prData.title,
    branch: targetBranch,
    owner: cleanOwner,
    repo: cleanRepo,
  };
}

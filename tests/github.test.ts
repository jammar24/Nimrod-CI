import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseGitHubPrUrl,
  detectLanguageFromFilename,
  fetchGitHubPr,
  createGitHubPullRequest,
} from '../lib/github';

describe('lib/github: URL parsing and language detection', () => {
  it('parses full GitHub PR URL correctly', () => {
    const res = parseGitHubPrUrl('https://github.com/3m3r4l/nimrod-ci/pull/12');
    expect(res).toEqual({
      owner: '3m3r4l',
      repo: 'nimrod-ci',
      pullNumber: 12,
    });
  });

  it('parses PR URL with /files suffix and www prefix', () => {
    const res = parseGitHubPrUrl('https://www.github.com/facebook/react/pull/42/files');
    expect(res).toEqual({
      owner: 'facebook',
      repo: 'react',
      pullNumber: 42,
    });
  });

  it('parses shorthand owner/repo#number format', () => {
    const res = parseGitHubPrUrl('nebius/nemotron-agent#99');
    expect(res).toEqual({
      owner: 'nebius',
      repo: 'nemotron-agent',
      pullNumber: 99,
    });
  });

  it('parses owner/repo/pull/number format without protocol', () => {
    const res = parseGitHubPrUrl('github.com/expressjs/express/pull/5000');
    expect(res).toEqual({
      owner: 'expressjs',
      repo: 'express',
      pullNumber: 5000,
    });
  });

  it('throws on invalid or non-PR URL format', () => {
    expect(() => parseGitHubPrUrl('not-a-url')).toThrow('Invalid GitHub Pull Request URL');
    expect(() => parseGitHubPrUrl('https://github.com/facebook/react')).toThrow(
      'Invalid GitHub Pull Request URL'
    );
  });

  it('detects language based on extension accurately', () => {
    expect(detectLanguageFromFilename('auth.ts')).toBe('typescript');
    expect(detectLanguageFromFilename('server.py')).toBe('python');
    expect(detectLanguageFromFilename('routes.js')).toBe('javascript');
    expect(detectLanguageFromFilename('App.tsx')).toBe('typescript');
  });
});

describe('lib/github: API interactions (mocked)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches PR details and diff smoothly', async () => {
    const mockMeta = {
      title: 'Fix SQL injection in authentication',
      body: 'Closes #10',
      user: { login: 'octocat' },
      state: 'open',
      base: { ref: 'main' },
      head: { ref: 'patch-1' },
      html_url: 'https://github.com/3m3r4l/nimrod-ci/pull/1',
    };

    const mockDiff = `--- a/routes/users.js\n+++ b/routes/users.js\n@@ -1,3 +1,3 @@\n-const query = "SELECT * FROM users WHERE id=" + id;\n+const query = "SELECT * FROM users WHERE id = $1";\n`;

    const mockFiles = [
      {
        filename: 'routes/users.js',
        status: 'modified',
        additions: 1,
        deletions: 1,
        changes: 2,
        raw_url: 'https://raw.githubusercontent.com/3m3r4l/nimrod-ci/main/routes/users.js',
      },
    ];

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/files')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockFiles),
        } as any);
      }
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('const query = "SELECT * FROM users WHERE id=" + id;'),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockMeta),
        text: () => Promise.resolve(mockDiff),
      } as any);
    });

    const result = await fetchGitHubPr({
      owner: '3m3r4l',
      repo: 'nimrod-ci',
      pullNumber: 1,
    });

    expect(result.owner).toBe('3m3r4l');
    expect(result.title).toBe('Fix SQL injection in authentication');
    expect(result.author).toBe('octocat');
    expect(result.files.length).toBe(1);
    expect(result.primaryFile?.filename).toBe('routes/users.js');
    expect(result.primaryFile?.language).toBe('javascript');
  });

  it('throws friendly error when PR is not found (404)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('{"message":"Not Found"}'),
    } as any);

    await expect(
      fetchGitHubPr({ owner: 'private-org', repo: 'secret', pullNumber: 99 })
    ).rejects.toThrow('Pull Request #99 not found');
  });

  it('fails fast when no GitHub token is provided for PR creation', async () => {
    await expect(
      createGitHubPullRequest({
        owner: '3m3r4l',
        repo: 'test-repo',
        baseBranch: 'main',
        filePath: 'test.js',
        patchedContent: 'console.log("fixed");',
      })
    ).rejects.toThrow('GitHub Personal Access Token (PAT) is required');
  });

  it('successfully creates branch, commits patch and opens Pull Request', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      // 1. Get base branch
      if (url.includes('/git/ref/heads/main')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ object: { sha: 'base-commit-sha-123' } }),
        } as any);
      }
      // 2. Create ref
      if (url.includes('/git/refs') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ ref: 'refs/heads/nimrod-ci/fix-sqli' }),
        } as any);
      }
      // 3. Get existing file sha
      if (url.includes('/contents/routes/users.js') && opts?.method !== 'PUT') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ sha: 'existing-blob-sha-456' }),
        } as any);
      }
      // 4. Update file
      if (url.includes('/contents/routes/users.js') && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: { sha: 'new-blob-sha-789' } }),
        } as any);
      }
      // 5. Open Pull Request
      if (url.includes('/pulls') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              html_url: 'https://github.com/3m3r4l/nimrod-ci/pull/42',
              number: 42,
              title: '[Nimrod-CI] Security Patch',
            }),
        } as any);
      }

      return Promise.reject(new Error(`Unhandled mock url: ${url}`));
    });

    const result = await createGitHubPullRequest({
      owner: '3m3r4l',
      repo: 'nimrod-ci',
      baseBranch: 'main',
      newBranch: 'nimrod-ci/fix-sqli',
      filePath: 'routes/users.js',
      patchedContent: 'db.query("SELECT * FROM users WHERE id = $1", [id])',
      token: 'DEMO_SECRET_not_a_real_key_1234',
    });

    expect(result.success).toBe(true);
    expect(result.prNumber).toBe(42);
    expect(result.prUrl).toBe('https://github.com/3m3r4l/nimrod-ci/pull/42');
  });
});

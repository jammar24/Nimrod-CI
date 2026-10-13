/**
 * Language detection helper for Sentinel-CI.
 * Accurately determines programming language (python, typescript, javascript)
 * from unified diffs, filenames, and source code heuristics.
 */

export type SupportedLanguage = 'python' | 'typescript' | 'javascript';

export function detectLanguage(
  diffOrCode: string,
  filename?: string
): SupportedLanguage {
  // 1. Check filename extension if provided
  if (filename) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'py') return 'python';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return 'javascript';
  }

  const text = diffOrCode || '';

  // 2. Check diff file headers (e.g., "--- a/app.py", "+++ b/src/auth.ts", "diff --git a/server.js")
  if (/^(?:---|\+\+\+|diff --git)\s+[ab]?\/?[^\r\n]*\.py\b/m.test(text)) {
    return 'python';
  }
  if (/^(?:---|\+\+\+|diff --git)\s+[ab]?\/?[^\r\n]*\.(?:tsx?)\b/m.test(text)) {
    return 'typescript';
  }
  if (/^(?:---|\+\+\+|diff --git)\s+[ab]?\/?[^\r\n]*\.(?:jsx?|mjs|cjs)\b/m.test(text)) {
    return 'javascript';
  }

  // 3. Python structural heuristics
  const isPython =
    /^\s*def\s+\w+\s*\(.*?\)\s*:/m.test(text) ||
    /^\s*class\s+\w+(?:\(.*?\))?\s*:/m.test(text) ||
    /^\s*from\s+[\w.]+\s+import\s+/m.test(text) ||
    /^\s*import\s+(?:pickle|os|sys|re|math|flask|django|requests|fastapi|logging)\b/m.test(text) ||
    /pickle\.(?:loads|dump|dumps|load)/.test(text) ||
    /request\.(?:form|args|values|files)/.test(text) ||
    /self\.\w+/.test(text) ||
    /\b(?:elif|except|finally)\s*:/.test(text) ||
    /\b(?:True|False|None)\b/.test(text) && !/===|!==/.test(text);

  if (isPython) {
    return 'python';
  }

  // 4. TypeScript specific types & syntax
  const isTypeScript =
    /^\s*(?:export\s+)?interface\s+\w+/m.test(text) ||
    /^\s*(?:export\s+)?type\s+\w+\s*=/m.test(text) ||
    /:\s*(?:string|number|boolean|any|void|unknown|never|Record<|Array<|Promise<)[,);=\n]/m.test(text) ||
    /as\s+(?:const|string|any|number|boolean|\w+)/.test(text) ||
    /<[A-Z]\w+>\s*\(/.test(text);

  if (isTypeScript) {
    return 'typescript';
  }

  // 5. Default fallback is JavaScript
  return 'javascript';
}

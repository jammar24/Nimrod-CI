import { describe, it, expect } from 'vitest';
import { detectLanguage } from '@/lib/detect';

describe('detectLanguage helper', () => {
  it('detects language from file extension', () => {
    expect(detectLanguage('', 'app.py')).toBe('python');
    expect(detectLanguage('', 'server.ts')).toBe('typescript');
    expect(detectLanguage('', 'Component.tsx')).toBe('typescript');
    expect(detectLanguage('', 'index.js')).toBe('javascript');
    expect(detectLanguage('', 'module.mjs')).toBe('javascript');
  });

  it('detects language from diff header file paths', () => {
    const pyDiff = `--- a/services/auth.py\n+++ b/services/auth.py\n@@ -1,4 +1,4 @@\n-import pickle\n+import json`;
    expect(detectLanguage(pyDiff)).toBe('python');

    const tsDiff = `--- a/src/types.ts\n+++ b/src/types.ts\n@@ -1,3 +1,4 @@\n+export interface User { id: string }`;
    expect(detectLanguage(tsDiff)).toBe('typescript');

    const jsDiff = `--- a/src/index.js\n+++ b/src/index.js\n@@ -1,3 +1,4 @@\n+const express = require('express');`;
    expect(detectLanguage(jsDiff)).toBe('javascript');
  });

  it('detects python from code heuristics', () => {
    const pythonCode = `
def load_session():
    token = request.form.get('token')
    raw_bytes = base64.b64decode(token)
    user_session = pickle.loads(raw_bytes)
    return user_session
`;
    expect(detectLanguage(pythonCode)).toBe('python');
  });

  it('detects typescript from type annotations and interfaces', () => {
    const tsCode = `
export interface SecurityConfig {
  maxRetries: number;
  apiKey: string;
}

export function configure(cfg: SecurityConfig): void {
  const safe = cfg as const;
}
`;
    expect(detectLanguage(tsCode)).toBe('typescript');
  });

  it('defaults to javascript for standard javascript code', () => {
    const jsCode = `
const express = require('express');
const app = express();

app.get('/api', (req, res) => {
  res.json({ status: 'ok' });
});
`;
    expect(detectLanguage(jsCode)).toBe('javascript');
  });
});

import { describe, it, expect } from 'vitest';
import { checkJavaScriptSyntax, checkTypeScriptSyntax, checkSyntax } from '@/lib/syntax';

describe('lib/syntax: AST Syntax verification engine', () => {
  it('validates clean JavaScript code using acorn', () => {
    const code = `
      import express from 'express';
      const app = express();
      app.get('/test', (req, res) => res.json({ ok: true }));
    `;
    const result = checkJavaScriptSyntax(code);
    expect(result.valid).toBe(true);
    expect(result.engineUsed).toBe('acorn');
  });

  it('detects syntax errors in broken JavaScript', () => {
    const brokenCode = `const x = ;`; // Missing expression
    const result = checkJavaScriptSyntax(brokenCode);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('validates TypeScript syntax with types and interfaces', () => {
    const tsCode = `
      interface User {
        id: string;
        roles: string[];
      }
      export function getUser(u: User): string {
        return u.id;
      }
    `;
    const result = checkTypeScriptSyntax(tsCode);
    expect(result.valid).toBe(true);
    expect(result.engineUsed).toBe('typescript');
  });

  it('detects syntax errors in invalid TypeScript', () => {
    const brokenTs = `export class Broken { let x: number; }`; // let not valid inside class body
    const result = checkTypeScriptSyntax(brokenTs);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles Python language routing', () => {
    const pyCode = `def hello():\n    return "world"`;
    const result = checkSyntax(pyCode, 'python');
    expect(result.valid).toBe(true);
    expect(result.engineUsed).toBe('none');
    expect(result.notes).toContain('Python');
  });
});

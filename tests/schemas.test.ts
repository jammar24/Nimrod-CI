import { describe, it, expect } from 'vitest';
import {
  FindingSchema,
  RiskyHunkSchema,
  PatchSchema,
  VerificationSchema,
  ReportSchema,
} from '@/lib/schemas';

describe('lib/schemas: Zod Schema contracts', () => {
  it('validates a valid Finding structure', () => {
    const validFinding = {
      id: 'f-1',
      title: 'SQL Injection',
      severity: 'critical',
      cwe: 'CWE-89',
      vulnerableSnippet: 'SELECT * FROM users WHERE name = ' + 'input',
      explanation: 'Unsanitized input in query',
      exploitScenario: 'Admin credentials exfiltration',
      confidence: 0.95,
    };

    const parsed = FindingSchema.safeParse(validFinding);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid severity level', () => {
    const invalid = {
      id: 'f-1',
      title: 'Bug',
      severity: 'extreme', // Invalid
      vulnerableSnippet: 'foo()',
      explanation: 'bar',
      exploitScenario: 'baz',
      confidence: 0.5,
    };

    const parsed = FindingSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('enforces confidence is bounded between 0 and 1', () => {
    const outOfBounds = {
      id: 'f-1',
      title: 'Bug',
      severity: 'high',
      vulnerableSnippet: 'foo()',
      explanation: 'bar',
      exploitScenario: 'baz',
      confidence: 1.5, // Exceeds 1.0
    };

    const parsed = FindingSchema.safeParse(outOfBounds);
    expect(parsed.success).toBe(false);
  });

  it('validates RiskyHunk structure', () => {
    const hunk = {
      file: 'app.js',
      lineStart: 10,
      lineEnd: 15,
      reason: 'Direct eval invocation',
    };
    expect(RiskyHunkSchema.safeParse(hunk).success).toBe(true);
  });

  it('validates Patch and Verification structures', () => {
    const patch = {
      findingId: 'f-1',
      unifiedDiff: '--- a/f.js\n+++ b/f.js\n@@ -1 +1 @@\n-eval(x)\n+JSON.parse(x)',
      patchedCode: 'JSON.parse(x)',
      rationale: 'Replace eval with JSON.parse',
    };
    expect(PatchSchema.safeParse(patch).success).toBe(true);

    const verification = {
      findingId: 'f-1',
      syntaxOk: true,
      resolved: true,
      iterations: 1,
      notes: 'Clean acorn check',
    };
    expect(VerificationSchema.safeParse(verification).success).toBe(true);
  });

  it('validates Report structure and enforces riskScore bounds 0-100', () => {
    const report = {
      riskScore: 65,
      verdict: 'review',
      summary: 'Medium security risk detected.',
      findings: [],
      patches: [],
      verifications: [],
      stats: {
        totalFindings: 1,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 1,
        lowCount: 0,
        verifiedPatchesCount: 0,
      },
    };

    expect(ReportSchema.safeParse(report).success).toBe(true);

    // Test riskScore over 100
    expect(ReportSchema.safeParse({ ...report, riskScore: 105 }).success).toBe(false);
  });
});

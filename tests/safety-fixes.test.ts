import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { runLivePipeline, StepProgress } from '@/lib/pipeline';
import { ensureDiffHeaderHasRealPath } from '@/lib/diffutil';
import { Finding, Patch, Verification } from '@/lib/schemas';
import { FindingCard } from '@/components/FindingCard';

describe('Safety fixes: tax.ts command injection & patch verification hard rules', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('(a) a patch containing eval is rejected by the re-analysis and triggers a retry', async () => {
    const taxDiff = `--- a/utils/tax.ts
+++ b/utils/tax.ts
@@ -10,3 +10,3 @@
 export function calculateTax(formula: string, amount: number) {
-  return eval(formula + " * " + amount);
+  return eval(formula);
 }
`;

    let patchCallCount = 0;
    let verifyCallCount = 0;
    const receivedFeedbacks: Array<string | undefined> = [];

    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      const body = init?.body ? JSON.parse(init.body as string) : {};

      if (urlStr.includes('/api/triage')) {
        return {
          ok: true,
          json: async () => ({
            riskyHunks: [{ file: 'utils/tax.ts', lineStart: 10, lineEnd: 12, reason: 'Command / code execution' }],
          }),
        } as Response;
      }

      if (urlStr.includes('/api/analyze')) {
        return {
          ok: true,
          json: async () => ({
            findings: [
              {
                id: 'finding-tax-eval',
                title: 'Code Injection via Dynamic Evaluation in calculateTax',
                severity: 'critical',
                cwe: 'CWE-95',
                owasp: 'A03:2021-Injection',
                file: 'utils/tax.ts',
                lineStart: 10,
                lineEnd: 12,
                vulnerableSnippet: 'return eval(formula);',
                explanation: 'User-controlled formula evaluated with eval() allows arbitrary code execution',
                exploitScenario: 'Attacker passes process.exit() or child_process commands',
                confidence: 0.99,
                references: [],
              },
            ],
          }),
        } as Response;
      }

      if (urlStr.includes('/api/enrich')) {
        return {
          ok: true,
          json: async () => ({ findings: body.findings }),
        } as Response;
      }

      if (urlStr.includes('/api/patch')) {
        patchCallCount++;
        receivedFeedbacks.push(body.feedback);

        if (patchCallCount === 1) {
          // Attempt 1: Model proposes a patch that still uses eval!
          return {
            ok: true,
            json: async () => ({
              patch: {
                findingId: 'finding-tax-eval',
                unifiedDiff: `--- a/utils/tax.ts\n+++ b/utils/tax.ts\n@@ -10,1 +10,1 @@\n-  return eval(formula);\n+  return eval(String(formula).trim());\n`,
                patchedCode: `export function calculateTax(formula: string, amount: number) {\n  return eval(String(formula).trim());\n}\n`,
                rationale: 'Sanitized formula before eval',
              },
            }),
          } as Response;
        } else {
          // Attempt 2 (Retry): Model fixes it safely by removing dynamic eval
          return {
            ok: true,
            json: async () => ({
              patch: {
                findingId: 'finding-tax-eval',
                unifiedDiff: `--- a/utils/tax.ts\n+++ b/utils/tax.ts\n@@ -10,1 +10,1 @@\n-  return eval(formula);\n+  const rate = Number(formula) || 0; return rate * amount;\n`,
                patchedCode: `export function calculateTax(formula: string, amount: number) {\n  const rate = Number(formula) || 0; return rate * amount;\n}\n`,
                rationale: 'Removed dynamic eval and parsed safe numeric rate',
              },
            }),
          } as Response;
        }
      }

      if (urlStr.includes('/api/verify')) {
        verifyCallCount++;

        if (verifyCallCount === 1) {
          // Attempt 1 Re-analysis: Rejects patch because it still contains eval
          return {
            ok: true,
            json: async () => ({
              verification: {
                findingId: 'finding-tax-eval',
                syntaxOk: true,
                resolved: false,
                iterations: 1,
                notes: 'Patched code still contains security weakness: eval introduces CWE-95 at line 11',
                syntaxEngine: 'typescript',
                verificationMethod: 'compiler_plus_model',
                consistencyOk: true,
              },
            }),
          } as Response;
        } else {
          // Attempt 2 Re-analysis: Confirms vulnerability eliminated with no new weaknesses
          return {
            ok: true,
            json: async () => ({
              verification: {
                findingId: 'finding-tax-eval',
                syntaxOk: true,
                resolved: true,
                iterations: 2,
                notes: 'Dynamic code execution completely eliminated: no eval or dynamic constructs present.',
                syntaxEngine: 'typescript',
                verificationMethod: 'compiler_plus_model',
                consistencyOk: true,
              },
            }),
          } as Response;
        }
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    });

    const progress: StepProgress[][] = [];
    const result = await runLivePipeline({
      diff: taxDiff,
      language: 'typescript',
      onProgress: (p) => progress.push(p),
    });

    // Verify retry was triggered
    expect(patchCallCount).toBe(2);
    expect(verifyCallCount).toBe(2);

    // Verify the failure reason from iteration 1 was sent to patch in iteration 2
    expect(receivedFeedbacks[0]).toBeUndefined();
    expect(receivedFeedbacks[1]).toBe(
      'Patched code still contains security weakness: eval introduces CWE-95 at line 11'
    );

    // Verify final report status
    const finalVerification = result.report.verifications[0];
    expect(finalVerification.resolved).toBe(true);
    expect(finalVerification.iterations).toBe(2);
    expect(result.report.patches[0].patchedCode).not.toContain('eval(');
  });

  it('(b) the PR button is hidden when verification fails, and warning is shown', () => {
    const finding: Finding = {
      id: 'finding-1',
      title: 'Command Injection in tax.ts',
      severity: 'critical',
      cwe: 'CWE-78',
      file: 'utils/tax.ts',
      vulnerableSnippet: 'eval(userInput)',
      explanation: 'Arbitrary code execution',
      exploitScenario: 'Attacker runs malicious code',
      confidence: 0.99,
      references: [],
    };

    const patch: Patch = {
      findingId: 'finding-1',
      unifiedDiff: `--- a/utils/tax.ts\n+++ b/utils/tax.ts\n@@ -1,1 +1,1 @@\n-eval(userInput)\n+eval(String(userInput))\n`,
      patchedCode: `eval(String(userInput))`,
      rationale: 'Tried to cast to String',
    };

    // Case 1: Verification failed
    const failedVerification: Verification = {
      findingId: 'finding-1',
      syntaxOk: true,
      resolved: false,
      iterations: 2,
      notes: 'Weakness persisted: eval still present at line 1 (CWE-95)',
    };

    const htmlFailed = renderToString(
      React.createElement(FindingCard, {
        finding,
        patch,
        verification: failedVerification,
        defaultExpanded: true,
        onOpenPrModal: vi.fn(),
        lang: 'en',
      })
    );

    // PR button must be hidden when verification fails
    expect(htmlFailed).not.toContain('Open PR with this Fix');
    expect(htmlFailed).not.toContain('open-pr-btn');

    // Red warning must be visible
    expect(htmlFailed).toContain('Verification failed: do not apply this patch');

    // Rationale note must be present
    expect(htmlFailed).toContain('Generated by the model; not independently verified.');

    // Attempts and failure reason must be visible on the badge
    expect(htmlFailed).toContain('Attempts: 2 of 2');
    expect(htmlFailed).toContain('Failure reason:');
    expect(htmlFailed).toContain('Weakness persisted: eval still present at line 1 (CWE-95)');

    // Warning on unverified patch diff must be visible
    expect(htmlFailed).toContain('Warning: Unverified');

    // Case 2: Verification succeeded
    const successVerification: Verification = {
      findingId: 'finding-1',
      syntaxOk: true,
      resolved: true,
      iterations: 1,
      notes: 'Remediated cleanly',
    };

    const htmlSuccess = renderToString(
      React.createElement(FindingCard, {
        finding,
        patch,
        verification: successVerification,
        defaultExpanded: true,
        onOpenPrModal: vi.fn(),
        lang: 'en',
      })
    );

    // PR button must be present when verified
    expect(htmlSuccess).toContain('Open PR with this Fix');

    // Red warning must NOT be present
    expect(htmlSuccess).not.toContain('Verification failed: do not apply this patch');
    expect(htmlSuccess).toContain('Patch Verified');
    expect(htmlSuccess).toContain('Attempts: 1 of 2');
  });

  it('guarantees diff header uses real path (utils/tax.ts)', () => {
    const rawDiffFromModel = `--- a/code.ts
+++ b/code.ts
@@ -10,3 +10,3 @@
- return eval(formula);
+ return safeCalculate(formula);
`;

    const normalizedDiff = ensureDiffHeaderHasRealPath(rawDiffFromModel, 'utils/tax.ts');
    expect(normalizedDiff).toContain('--- a/utils/tax.ts');
    expect(normalizedDiff).toContain('+++ b/utils/tax.ts');
    expect(normalizedDiff).not.toContain('--- a/code.ts');
    expect(normalizedDiff).not.toContain('+++ b/code.ts');
  });
});

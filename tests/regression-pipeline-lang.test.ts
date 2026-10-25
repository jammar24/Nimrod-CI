import { describe, it, expect, vi, afterEach } from 'vitest';
import { runLivePipeline, StepProgress, INITIAL_PIPELINE_STEPS } from '@/lib/pipeline';
import { SECURITY_FIXTURES } from '@/lib/examples';
import { detectLanguage } from '@/lib/detect';
import { checkPatchConsistency } from '@/lib/diffutil';
import { calculateRiskScoreAndVerdict } from '@/lib/score';
import { Finding, Patch, Verification } from '@/lib/schemas';

describe('Regression Test: Replacing JS Example with Python Diff in Pipeline', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('correctly reconstructs Python originalCode, generates Python patch, and ensures no JS appears', async () => {
    // 1. Load the JavaScript example "Prompt Injection Trap"
    const jsExample = SECURITY_FIXTURES.find((f) => f.id === 'prompt-injection-trap')!;
    expect(jsExample.language).toBe('javascript');
    expect(jsExample.originalCode).toContain('express');
    expect(jsExample.originalCode).toContain('exec(');

    // 2. Replace the text with a Python diff (Flask /ping with subprocess shell=True)
    const pythonDiff = `--- a/routes/network.py
+++ b/routes/network.py
@@ -1,6 +1,8 @@
 from flask import Flask, request
 import subprocess
 
 app = Flask(__name__)
 
 @app.route('/ping', methods=['POST'])
 def ping():
-    return 'pong'
+    host = request.form.get('host')
+    subprocess.call("ping -c 1 " + host, shell=True)
+    return 'done'
`;

    let capturedPatchOriginalCode = '';
    let capturedPatchLanguage = '';
    let capturedVerifyLanguage = '';

    // Mock fetch for pipeline endpoints
    globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString();
      const body = init?.body ? JSON.parse(init.body as string) : {};

      if (urlStr.includes('/api/triage')) {
        return {
          ok: true,
          json: async () => ({
            riskyHunks: [
              {
                file: 'routes/network.py',
                lineStart: 6,
                lineEnd: 8,
                reason: 'subprocess.call with shell=True',
              },
            ],
          }),
        } as Response;
      }

      if (urlStr.includes('/api/analyze')) {
        return {
          ok: true,
          json: async () => ({
            findings: [
              {
                id: 'finding-cwe-78-py',
                title: 'OS Command Injection via shell=True in ping handler',
                severity: 'critical',
                cwe: 'CWE-78',
                owasp: 'A03:2021-Injection',
                file: 'routes/network.py',
                lineStart: 7,
                lineEnd: 8,
                vulnerableSnippet: 'subprocess.call("ping -c 1 " + host, shell=True)',
                explanation: 'Untrusted user input concatenated into shell=True subprocess execution',
                exploitScenario: 'Attacker injects ; cat /etc/passwd',
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
          json: async () => ({
            findings: body.findings,
          }),
        } as Response;
      }

      if (urlStr.includes('/api/patch')) {
        capturedPatchOriginalCode = body.originalCode;
        capturedPatchLanguage = body.language;

        return {
          ok: true,
          json: async () => ({
            patch: {
              findingId: 'finding-cwe-78-py',
              unifiedDiff: `--- a/routes/network.py
+++ b/routes/network.py
@@ -7,2 +7,2 @@
-    subprocess.call("ping -c 1 " + host, shell=True)
+    subprocess.run(['ping', '-c', '1', host], check=True)
`,
              patchedCode: `from flask import Flask, request
import subprocess

app = Flask(__name__)

@app.route('/ping', methods=['POST'])
def ping():
    host = request.form.get('host')
    subprocess.run(['ping', '-c', '1', host], check=True)
    return 'done'
`,
              rationale: 'Replaced shell=True call with subprocess.run taking argument list.',
            },
          }),
        } as Response;
      }

      if (urlStr.includes('/api/verify')) {
        capturedVerifyLanguage = body.language;

        return {
          ok: true,
          json: async () => ({
            verification: {
              findingId: 'finding-cwe-78-py',
              syntaxOk: true,
              resolved: true,
              iterations: 1,
              notes: 'Syntax check not available for Python; model re-analysis only. Command injection resolved with subprocess array arguments.',
              syntaxEngine: 'none',
              verificationMethod: 'model_only',
              consistencyOk: true,
            },
          }),
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      } as Response;
    });

    // 3. Run pipeline passing the Python diff and the stale example's originalCode
    const progressUpdates: StepProgress[][] = [];
    const result = await runLivePipeline({
      diff: pythonDiff,
      originalCode: jsExample.originalCode, // Stale example originalCode from UI
      language: 'auto',
      onProgress: (steps) => progressUpdates.push(steps),
    });

    // 4. Assert original code sent to Patch step was reconstructed from Python diff
    expect(capturedPatchOriginalCode).not.toContain('express');
    expect(capturedPatchOriginalCode).not.toContain('child_process');
    expect(capturedPatchOriginalCode).not.toContain('SYSTEM INSTRUCTION');
    expect(capturedPatchOriginalCode).toContain('from flask import Flask');
    expect(capturedPatchOriginalCode).toContain('subprocess.call');

    // Assert language resolved to Python, not JavaScript
    expect(capturedPatchLanguage).toBe('python');
    expect(capturedVerifyLanguage).toBe('python');

    // 5. Assert the resulting patch is Python and contains no JS content
    const patch = result.report.patches[0];
    expect(patch).toBeDefined();
    expect(detectLanguage(patch.patchedCode)).toBe('python');
    expect(patch.patchedCode).toContain('from flask import Flask');
    expect(patch.patchedCode).toContain('subprocess.run');
    expect(patch.patchedCode).not.toContain('express');
    expect(patch.patchedCode).not.toContain('require(');
    expect(patch.patchedCode).not.toContain('child_process');
    expect(patch.patchedCode).not.toContain('execFile');
    expect(patch.patchedCode).not.toContain('SYSTEM INSTRUCTION');

    // 6. Assert verification uses model-only / no Acorn for Python
    const verification = result.report.verifications[0];
    expect(verification).toBeDefined();
    expect(verification.syntaxEngine).toBe('none');
    expect(verification.notes).toContain('Syntax check not available for Python; model re-analysis only');
    expect(verification.notes).not.toContain('Acorn');

    // 7. Assert timing per step is measured separately
    const lastSteps = progressUpdates[progressUpdates.length - 1];
    const patchStep = lastSteps.find((s) => s.id === 'patch')!;
    const verifyStep = lastSteps.find((s) => s.id === 'verify')!;
    expect(patchStep.durationMs).toBeDefined();
    expect(verifyStep.durationMs).toBeDefined();
  });

  it('marks verification as failed and sets verdict to REVIEW when patch language/file is inconsistent with finding', () => {
    const finding: Finding = {
      id: 'f-py-1',
      title: 'Python Command Injection',
      severity: 'critical',
      cwe: 'CWE-78',
      file: 'routes/network.py',
      vulnerableSnippet: 'subprocess.call("ping " + host, shell=True)',
      explanation: 'Vulnerable command execution',
      exploitScenario: 'exploit',
      confidence: 1.0,
      references: [],
    };

    // Erroneous JavaScript patch (as occurred in the bug symptom)
    const mismatchedPatch: Patch = {
      findingId: 'f-py-1',
      unifiedDiff: `--- a/routes/network.js\n+++ b/routes/network.js\n@@ -1,1 +1,1 @@\n-exec("ping " + host)\n+execFile("ping", [host])\n`,
      patchedCode: `const { execFile } = require('child_process');\nexecFile("ping", [host]);\n`,
      rationale: 'Use execFile in Node.js',
    };

    // Consistency check must fail
    const consistency = checkPatchConsistency(finding, mismatchedPatch, 'python');
    expect(consistency.valid).toBe(false);
    expect(consistency.reason).toContain('Language mismatch');

    // Verification object when consistency fails
    const failedVerification: Verification = {
      findingId: 'f-py-1',
      syntaxOk: false,
      resolved: false,
      iterations: 1,
      notes: `Patch consistency check failed: ${consistency.reason}`,
      syntaxEngine: 'none',
      consistencyOk: false,
    };

    // Verdict must be 'review' (not pass and not block)
    const reportScore = calculateRiskScoreAndVerdict([finding], [failedVerification]);
    expect(reportScore.verdict).toBe('review');
    expect(reportScore.summary).toContain('consistency check failed');
  });
});

import { describe, it, expect } from 'vitest';
import {
  applyPatchToCode,
  createUnifiedDiff,
  reconstructOriginalCodeFromDiff,
  resolveOriginalCode,
  checkPatchConsistency,
} from '@/lib/diffutil';
import { SECURITY_FIXTURES } from '@/lib/examples';
import { Finding, Patch } from '@/lib/schemas';

describe('lib/diffutil: Patch application and diffing', () => {
  it('applies a standard unified diff cleanly', () => {
    const original = `const a = 1;\nconst b = 2;\n`;
    const diff = `--- a/file.js\n+++ b/file.js\n@@ -2,1 +2,1 @@\n-const b = 2;\n+const b = 42;\n`;

    const result = applyPatchToCode(original, diff);
    expect(result.success).toBe(true);
    expect(result.patchedCode).toContain('const b = 42;');
  });

  it('uses fallback patchedCode if diff fails to apply cleanly', () => {
    const original = `const a = 1;\nconst b = 2;\n`;
    const brokenDiff = `--- a/broken.js\n+++ b/broken.js\n@@ -99,1 +99,1 @@\n-nonexistent\n+fixed\n`;
    const fallbackCode = `const a = 1;\nconst b = 42;\n`;

    const result = applyPatchToCode(original, brokenDiff, fallbackCode);
    expect(result.success).toBe(true);
    expect(result.patchedCode).toBe(fallbackCode);
  });

  it('creates unified diff patch between strings', () => {
    const oldStr = 'function test() { return false; }';
    const newStr = 'function test() { return true; }';

    const patch = createUnifiedDiff('test.js', oldStr, newStr);
    expect(patch).toContain('--- test.js');
    expect(patch).toContain('+++ test.js');
    expect(patch).toContain('-function test() { return false; }');
    expect(patch).toContain('+function test() { return true; }');
  });

  it('reconstructs source code from a unified diff correctly', () => {
    const pythonDiff = `--- a/routes/network.py
+++ b/routes/network.py
@@ -1,5 +1,6 @@
 from flask import Flask, request
 import subprocess
+app = Flask(__name__)
-old_line
+@app.route('/ping')
 def ping():
`;
    const reconstructed = reconstructOriginalCodeFromDiff(pythonDiff);
    expect(reconstructed).toContain('from flask import Flask, request');
    expect(reconstructed).toContain('import subprocess');
    expect(reconstructed).toContain('app = Flask(__name__)');
    expect(reconstructed).toContain("@app.route('/ping')");
    expect(reconstructed).toContain('def ping():');
    expect(reconstructed).not.toContain('old_line');
    expect(reconstructed).not.toContain('---');
    expect(reconstructed).not.toContain('+++');
  });

  it('never reuses a loaded example stored originalCode when diff is replaced with custom diff', () => {
    // Loaded example: Prompt Injection Trap (JavaScript)
    const jsExample = SECURITY_FIXTURES.find((f) => f.id === 'prompt-injection-trap')!;
    expect(jsExample.originalCode).toContain('express');

    // User pastes Python diff
    const pythonDiff = `--- a/app.py
+++ b/app.py
@@ -1,4 +1,4 @@
 from flask import Flask, request
 import subprocess
+host = request.args.get('host')
`;

    // Even if stale JS example originalCode is passed in:
    const resolved = resolveOriginalCode(pythonDiff, jsExample.originalCode);

    // Must NOT contain JavaScript/express code!
    expect(resolved).not.toContain('express');
    expect(resolved).not.toContain('child_process');
    // Must contain the reconstructed Python code!
    expect(resolved).toContain('from flask import Flask, request');
    expect(resolved).toContain('import subprocess');
  });

  it('detects language and file path inconsistencies between finding and patch', () => {
    const pythonFinding: Finding = {
      id: 'f-1',
      title: 'Command Injection in ping',
      severity: 'critical',
      cwe: 'CWE-78',
      file: 'routes/network.py',
      vulnerableSnippet: 'subprocess.call("ping -c 1 " + host, shell=True)',
      explanation: 'shell=True allows arbitrary OS command injection',
      exploitScenario: 'inject via ; rm -rf',
      confidence: 0.95,
      references: [],
    };

    // Inconsistent patch: JavaScript code modifying .js
    const jsPatch: Patch = {
      findingId: 'f-1',
      unifiedDiff: `--- a/routes/network.js\n+++ b/routes/network.js\n@@ -1,1 +1,1 @@\n-exec(cmd)\n+execFile('ping', [host])\n`,
      patchedCode: `const { execFile } = require('child_process');\nexecFile('ping', [host]);\n`,
      rationale: 'Use execFile',
    };

    const result = checkPatchConsistency(pythonFinding, jsPatch, 'python');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Language mismatch');

    // Consistent patch: Python code modifying .py
    const pyPatch: Patch = {
      findingId: 'f-1',
      unifiedDiff: `--- a/routes/network.py\n+++ b/routes/network.py\n@@ -1,1 +1,1 @@\n-subprocess.call(cmd, shell=True)\n+subprocess.run(['ping', '-c', '1', host])\n`,
      patchedCode: `import subprocess\nsubprocess.run(['ping', '-c', '1', host])\n`,
      rationale: 'Use subprocess.run without shell=True',
    };

    const pyResult = checkPatchConsistency(pythonFinding, pyPatch, 'python');
    expect(pyResult.valid).toBe(true);
  });
});

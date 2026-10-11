import { describe, it, expect } from 'vitest';
import { runInSandbox, testCodeWithPoc, verifyPatchWithPoc } from '@/lib/sandbox';
import { PocHarness } from '@/lib/schemas';

describe('lib/sandbox: Safe VM Execution & Differential PoC Verification', () => {
  it('executes safe JavaScript code and captures output', () => {
    const code = `
      const a = 10;
      const b = 20;
      console.log('Result is', a + b);
    `;
    const res = runInSandbox(code);
    expect(res.success).toBe(true);
    expect(res.output).toContain('Result is 30');
    expect(res.error).toBeUndefined();
  });

  it('prevents sandbox escape and has no process or require', () => {
    const code = `
      try {
        console.log(typeof process);
      } catch (e) {
        console.log('process undefined');
      }
    `;
    const res = runInSandbox(code);
    expect(res.output).toContain('undefined');
  });

  it('enforces strict timeout against infinite loops', () => {
    const infiniteLoop = `
      while (true) {}
    `;
    const res = runInSandbox(infiniteLoop, { timeoutMs: 100 });
    expect(res.success).toBe(false);
    expect(res.error).toContain('timed out');
  });

  describe('Differential PoC Execution (SQL Injection Example)', () => {
    const vulnerableCode = `
      function getUser(id) {
        return "SELECT * FROM users WHERE id = '" + id + "'";
      }
    `;

    const patchedCode = `
      function getUser(id) {
        // Escaped or parameterized
        const safeId = String(id).replace(/'/g, "''");
        return "SELECT * FROM users WHERE id = '" + safeId + "'";
      }
    `;

    const poc: PocHarness = {
      findingId: 'f-sqli',
      description: 'Test SQL injection tautology bypass',
      attackInput: "' OR '1'='1",
      testHarnessCode: `
        const query = getUser("' OR '1'='1");
        if (query.includes("' OR '1'='1'")) {
          __reportExploit(true, "Tautology payload injected into raw query: " + query);
        } else {
          __reportExploit(false, "Query sanitized: " + query);
        }
      `,
      expectedVulnerableOutcome: 'Tautology payload injected',
    };

    it('detects exploit in vulnerable code', () => {
      const outcome = testCodeWithPoc(vulnerableCode, poc);
      expect(outcome.exploited).toBe(true);
      expect(outcome.output).toContain('Tautology payload injected');
    });

    it('detects block in patched code', () => {
      const outcome = testCodeWithPoc(patchedCode, poc);
      expect(outcome.exploited).toBe(false);
      expect(outcome.output).toContain('Query sanitized');
    });

    it('verifies patch differentially: exploitable before, blocked after', () => {
      const result = verifyPatchWithPoc('f-sqli', vulnerableCode, patchedCode, poc, 'javascript');
      expect(result.status).toBe('verified');
      expect(result.beforePatch.exploited).toBe(true);
      expect(result.afterPatch.exploited).toBe(false);
      expect(result.notes).toContain('PoC verified');
    });

    it('flags still_exploitable if patch fails to mitigate payload', () => {
      const brokenPatch = `
        function getUser(id) {
          // Ineffective fix
          return "SELECT * FROM users WHERE id = '" + id + "'";
        }
      `;
      const result = verifyPatchWithPoc('f-sqli', vulnerableCode, brokenPatch, poc, 'javascript');
      expect(result.status).toBe('still_exploitable');
      expect(result.beforePatch.exploited).toBe(true);
      expect(result.afterPatch.exploited).toBe(true);
    });
  });

  describe('Path Traversal PoC', () => {
    const vulnerablePathCode = `
      function resolveFilePath(userPath) {
        return "/var/www/uploads/" + userPath;
      }
    `;

    const patchedPathCode = `
      function resolveFilePath(userPath) {
        const clean = userPath.replace(/\\.\\./g, '');
        return "/var/www/uploads/" + clean;
      }
    `;

    const pathPoc: PocHarness = {
      findingId: 'f-traversal',
      description: 'Test directory traversal with dot-dot-slash',
      attackInput: '../../../etc/passwd',
      testHarnessCode: `
        const resolved = resolveFilePath("../../../etc/passwd");
        if (resolved.includes("..")) {
          __reportExploit(true, "Directory traversal succeeded: " + resolved);
        } else {
          __reportExploit(false, "Traversal blocked: " + resolved);
        }
      `,
      expectedVulnerableOutcome: 'Directory traversal succeeded',
    };

    it('verifies path traversal mitigation', () => {
      const result = verifyPatchWithPoc('f-traversal', vulnerablePathCode, patchedPathCode, pathPoc, 'javascript');
      expect(result.status).toBe('verified');
      expect(result.beforePatch.exploited).toBe(true);
      expect(result.afterPatch.exploited).toBe(false);
    });
  });
});

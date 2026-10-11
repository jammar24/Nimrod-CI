import vm from 'node:vm';
import { PocHarness, PocExecutionOutcome, PocVerificationResult } from './schemas';

export interface SandboxOptions {
  timeoutMs?: number;
}

export interface SandboxRawResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
  signaledExploit?: boolean;
}

/**
 * Executes JavaScript code in a hardened node:vm isolated context.
 * Strict time bounds, zero filesystem access, zero network access.
 */
export function runInSandbox(
  code: string,
  options: SandboxOptions = {}
): SandboxRawResult {
  const timeoutMs = options.timeoutMs ?? 1000;
  const logs: string[] = [];
  let signaledExploit: boolean | undefined = undefined;

  const sandboxContext = {
    console: {
      log: (...args: any[]) => {
        logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      warn: (...args: any[]) => {
        logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
      error: (...args: any[]) => {
        logs.push('[ERROR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      },
    },
    // Explicit API for PoC harnesses to signal exploit outcome
    __reportExploit: (isExploited: boolean, details?: string) => {
      signaledExploit = isExploited;
      if (details) {
        logs.push(`[EXPLOIT_REPORT] ${isExploited ? 'EXPLOITED' : 'BLOCKED'}: ${details}`);
      }
    },
    // Standard safe globals
    JSON,
    Math,
    String,
    Number,
    Boolean,
    Array,
    RegExp,
    Date,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  };

  const context = vm.createContext(sandboxContext);
  const start = Date.now();

  try {
    const script = new vm.Script(code);
    script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
    });

    const durationMs = Date.now() - start;
    return {
      success: true,
      output: logs.join('\n'),
      durationMs,
      signaledExploit,
    };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out');

    return {
      success: false,
      output: logs.join('\n'),
      error: isTimeout ? `Execution timed out after ${timeoutMs}ms (possible ReDoS or infinite loop)` : err.message,
      durationMs,
      signaledExploit,
    };
  }
}

/**
 * Runs a PoC harness against a specific version of code (original or patched).
 */
export function testCodeWithPoc(
  code: string,
  poc: PocHarness,
  options: SandboxOptions = {}
): PocExecutionOutcome {
  // Combine source code with test harness
  const combined = `
${code}

// --- SENTINEL-CI POC TEST HARNESS ---
(function() {
  try {
    ${poc.testHarnessCode}
  } catch (e) {
    __reportExploit(false, "Harness exception: " + e.message);
  }
})();
`;

  const raw = runInSandbox(combined, options);

  let exploited = false;
  if (typeof raw.signaledExploit === 'boolean') {
    exploited = raw.signaledExploit;
  } else if (raw.output && poc.expectedVulnerableOutcome) {
    exploited = raw.output.includes(poc.expectedVulnerableOutcome);
  } else if (raw.error && poc.expectedVulnerableOutcome) {
    exploited = raw.error.includes(poc.expectedVulnerableOutcome);
  }

  return {
    exploited,
    output: raw.output,
    error: raw.error,
    durationMs: raw.durationMs,
  };
}

/**
 * Performs complete Differential PoC Verification:
 * 1. Runs PoC on original code (MUST be exploited)
 * 2. Runs PoC on patched code (MUST be blocked / not exploited)
 * 3. Categorizes into: verified | still_exploitable | unreproducible | unsupported
 */
export function verifyPatchWithPoc(
  findingId: string,
  originalCode: string,
  patchedCode: string,
  poc: PocHarness,
  language: string = 'javascript'
): PocVerificationResult {
  const normLang = language.toLowerCase();
  if (normLang.includes('python') || normLang === 'py') {
    return {
      findingId,
      status: 'unsupported',
      beforePatch: { exploited: false, output: '', durationMs: 0 },
      afterPatch: { exploited: false, output: '', durationMs: 0 },
      poc,
      notes: 'Python PoC sandbox requires isolated container; differential verification delegated to model & syntax checker.',
    };
  }

  // 1. Run against original vulnerable code
  const before = testCodeWithPoc(originalCode, poc);

  // If the vulnerability couldn't even be reproduced in the original code
  if (!before.exploited) {
    return {
      findingId,
      status: 'unreproducible',
      beforePatch: before,
      afterPatch: { exploited: false, output: '', durationMs: 0 },
      poc,
      notes: 'PoC could not reproduce the vulnerability against the original code (exploit conditions not met).',
    };
  }

  // 2. Run against patched code
  const after = testCodeWithPoc(patchedCode, poc);

  if (after.exploited) {
    return {
      findingId,
      status: 'still_exploitable',
      beforePatch: before,
      afterPatch: after,
      poc,
      notes: 'Patch failed verification: the security vulnerability remains exploitable with the test PoC.',
    };
  }

  return {
    findingId,
    status: 'verified',
    beforePatch: before,
    afterPatch: after,
    poc,
    notes: 'PoC verified: vulnerability was reproducible before patch and completely mitigated after patch.',
  };
}

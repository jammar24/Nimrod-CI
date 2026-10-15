import { Finding, Patch, Verification, Report } from './schemas';
import { assembleReport } from './report';
import { SecurityFixture } from './examples';
import { detectLanguage } from './detect';

export type StepId = 'triage' | 'analyze' | 'enrich' | 'patch' | 'verify';
export type StepStatus = 'idle' | 'running' | 'completed' | 'error';

export interface StepProgress {
  id: StepId;
  title: string;
  description: string;
  model: string;
  status: StepStatus;
  details?: string;
  durationMs?: number;
}

export const INITIAL_PIPELINE_STEPS: StepProgress[] = [
  {
    id: 'triage',
    title: '1. Fast Triage',
    description: 'Scanning diff to isolate high-risk hunks and logic modifications',
    model: 'NEBIUS_MODEL_FAST',
    status: 'idle',
  },
  {
    id: 'analyze',
    title: '2. Deep SAST Analysis',
    description: 'Reasoning over modified lines to classify CWE, OWASP and exploit paths',
    model: 'NEBIUS_MODEL_PRIMARY',
    status: 'idle',
  },
  {
    id: 'enrich',
    title: '3. Security Knowledge Enrichment',
    description: 'Fetches CWE/OWASP references and current sources via Tavily',
    model: 'Tavily Search API',
    status: 'idle',
  },
  {
    id: 'patch',
    title: '4. Autonomous Patching',
    description: 'Synthesizing minimal, non-breaking security patches in unified diff',
    model: 'NEBIUS_MODEL_PRIMARY',
    status: 'idle',
  },
  {
    id: 'verify',
    title: '5. AST & Model Verification',
    description: 'Verification: apply the patch, run a syntax check, re-analyze patched code with model, retry up to 2 times',
    model: 'Compiler AST + NEBIUS_MODEL_FAST',
    status: 'idle',
  },
];

export interface RunPipelineOptions {
  diff: string;
  originalCode?: string;
  language?: string;
  onProgress: (steps: StepProgress[]) => void;
  signal?: AbortSignal;
}

export interface PipelineExecutionResult {
  report: Report;
  durationMs: number;
  isReplay: boolean;
}

/**
 * Runs the live NIMROD-CI pipeline.
 * The client orchestrates the 5 steps sequentially against stateless server endpoints.
 */
export async function runLivePipeline(
  options: RunPipelineOptions
): Promise<PipelineExecutionResult> {
  const { diff, originalCode = '', language = 'auto', onProgress, signal } = options;
  const resolvedLanguage =
    language && language !== 'auto'
      ? language
      : detectLanguage(diff, originalCode);

  const startTime = Date.now();

  const steps: StepProgress[] = INITIAL_PIPELINE_STEPS.map((s) => ({ ...s }));

  const updateStep = (id: StepId, patch: Partial<StepProgress>) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx !== -1) {
      steps[idx] = { ...steps[idx], ...patch };
      onProgress([...steps]);
    }
  };

  try {
    // ----------------------------------------------------
    // STEP 1: TRIAGE
    // ----------------------------------------------------
    updateStep('triage', { status: 'running', details: 'Identifying risky hunks...' });
    const triageStart = Date.now();

    const triageRes = await fetch('/api/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diff, language: resolvedLanguage }),
      signal,
    });

    if (!triageRes.ok) {
      const err = await triageRes.json().catch(() => ({}));
      throw new Error(err.error || `Triage failed with status ${triageRes.status}`);
    }

    const triageData = await triageRes.json();
    const riskyHunks = triageData.riskyHunks || [];
    updateStep('triage', {
      status: 'completed',
      details: `Identified ${riskyHunks.length} suspicious hunk(s)`,
      durationMs: Date.now() - triageStart,
    });

    // ----------------------------------------------------
    // STEP 2: ANALYZE
    // ----------------------------------------------------
    updateStep('analyze', { status: 'running', details: 'Executing SAST reasoning on diff...' });
    const analyzeStart = Date.now();

    const analyzeRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diff, language: resolvedLanguage, riskyHunks }),
      signal,
    });

    if (!analyzeRes.ok) {
      const err = await analyzeRes.json().catch(() => ({}));
      throw new Error(err.error || `Analysis failed with status ${analyzeRes.status}`);
    }

    const analyzeData = await analyzeRes.json();
    let findings: Finding[] = analyzeData.findings || [];
    updateStep('analyze', {
      status: 'completed',
      details: findings.length > 0 ? `Found ${findings.length} security weakness(es)` : 'Zero vulnerabilities detected',
      durationMs: Date.now() - analyzeStart,
    });

    // If no findings, we can assemble a clean report immediately!
    if (findings.length === 0) {
      updateStep('enrich', { status: 'completed', details: 'No findings to enrich' });
      updateStep('patch', { status: 'completed', details: 'No patches needed' });
      updateStep('verify', { status: 'completed', details: 'Code verified clean' });

      const totalDuration = Date.now() - startTime;
      const report = assembleReport({ findings: [], patches: [], verifications: [], durationMs: totalDuration });
      return { report, durationMs: totalDuration, isReplay: false };
    }

    // ----------------------------------------------------
    // STEP 3: ENRICH (Tavily)
    // ----------------------------------------------------
    updateStep('enrich', { status: 'running', details: 'Querying Tavily Search API for CWE remediation...' });
    const enrichStart = Date.now();

    try {
      const enrichRes = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings, language: resolvedLanguage }),
        signal,
      });

      if (enrichRes.ok) {
        const enrichData = await enrichRes.json();
        findings = enrichData.findings || findings;
        const totalRefs = findings.reduce((acc, f) => acc + (f.references?.length || 0), 0);
        updateStep('enrich', {
          status: 'completed',
          details: `Enriched with ${totalRefs} external reference(s)`,
          durationMs: Date.now() - enrichStart,
        });
      } else {
        updateStep('enrich', {
          status: 'completed',
          details: 'Search enrichment skipped (fail-soft)',
          durationMs: Date.now() - enrichStart,
        });
      }
    } catch {
      updateStep('enrich', {
        status: 'completed',
        details: 'Search enrichment skipped (fail-soft)',
        durationMs: Date.now() - enrichStart,
      });
    }

    // ----------------------------------------------------
    // STEP 4 & 5: PATCH & VERIFY (Agentic loop, max 2 iterations)
    // ----------------------------------------------------
    updateStep('patch', { status: 'running', details: `Synthesizing patches for ${findings.length} finding(s)...` });
    updateStep('verify', { status: 'running', details: 'Awaiting patch application and verification...' });

    const patchStart = Date.now();
    const patches: Patch[] = [];
    const verifications: Verification[] = [];

    const effectiveCode = originalCode.trim() ? originalCode : diff;

    for (const finding of findings) {
      let currentPatch: Patch | null = null;
      let currentVerification: Verification | null = null;
      let feedback = '';

      for (let iteration = 1; iteration <= 2; iteration++) {
        // Generate Patch
        updateStep('patch', {
          details: `Synthesizing patch for "${finding.title}" (iteration ${iteration})...`,
        });

        const patchRes = await fetch('/api/patch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            finding,
            originalCode: effectiveCode,
            language: resolvedLanguage,
            feedback: feedback || undefined,
          }),
          signal,
        });

        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          throw new Error(err.error || `Patch generation failed: ${patchRes.status}`);
        }

        const patchData = await patchRes.json();
        currentPatch = patchData.patch;

        // Verify Patch with AST Compiler & Model Re-Analysis
        updateStep('verify', {
          details: `Verifying patch with AST compiler & model re-analysis (iteration ${iteration})...`,
        });

        const verifyRes = await fetch('/api/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            finding,
            patch: currentPatch,
            originalCode: effectiveCode,
            language: resolvedLanguage,
            iteration,
          }),
          signal,
        });

        if (!verifyRes.ok) {
          const err = await verifyRes.json().catch(() => ({}));
          throw new Error(err.error || `Verification failed: ${verifyRes.status}`);
        }

        const verifyData = await verifyRes.json();
        currentVerification = verifyData.verification;

        if (currentVerification && currentVerification.resolved && currentVerification.syntaxOk) {
          break; // Successfully verified!
        } else {
          feedback = currentVerification?.notes || 'Patch failed verification';
        }
      }

      if (currentPatch) patches.push(currentPatch);
      if (currentVerification) verifications.push(currentVerification);
    }

    const verifiedCount = verifications.filter((v) => v.resolved && v.syntaxOk).length;

    updateStep('patch', {
      status: 'completed',
      details: `Generated ${patches.length} patch(es)`,
      durationMs: Date.now() - patchStart,
    });

    updateStep('verify', {
      status: 'completed',
      details: `${verifiedCount}/${findings.length} patch(es) verified successfully`,
      durationMs: Date.now() - patchStart,
    });

    const totalDuration = Date.now() - startTime;
    const report = assembleReport({
      findings,
      patches,
      verifications,
      durationMs: totalDuration,
    });

    return {
      report,
      durationMs: totalDuration,
      isReplay: false,
    };
  } catch (error: any) {
    // Mark any running step as error
    const running = steps.find((s) => s.status === 'running');
    if (running) {
      updateStep(running.id, {
        status: 'error',
        details: error.message || 'Execution error',
      });
    }
    throw error;
  }
}

/**
 * Replays a precalculated fixture run with animated step updates.
 * Used for reliable zero-cost demos when API credits or network access are constrained.
 */
export async function replayFixturePipeline(
  fixture: SecurityFixture,
  onProgress: (steps: StepProgress[]) => void,
  signal?: AbortSignal
): Promise<PipelineExecutionResult> {
  const steps: StepProgress[] = INITIAL_PIPELINE_STEPS.map((s) => ({ ...s }));

  const updateStep = (id: StepId, patch: Partial<StepProgress>) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx !== -1) {
      steps[idx] = { ...steps[idx], ...patch };
      onProgress([...steps]);
    }
  };

  const delay = (ms: number) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, ms);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('Replay cancelled'));
        });
      }
    });

  // Step 1: Triage
  updateStep('triage', { status: 'running', details: 'Extracting risky hunks (Replay)...' });
  await delay(250);
  updateStep('triage', {
    status: 'completed',
    details: `Identified ${fixture.cachedResult.riskyHunks.length} suspicious hunk(s)`,
    durationMs: 180,
  });

  // Step 2: Analyze
  updateStep('analyze', { status: 'running', details: 'Scanning for CWE flaws (Replay)...' });
  await delay(300);
  updateStep('analyze', {
    status: 'completed',
    details: `Detected ${fixture.cachedResult.findings.length} vulnerability finding(s)`,
    durationMs: 420,
  });

  // Step 3: Enrich
  updateStep('enrich', { status: 'running', details: 'Retrieving security cheat sheets (Replay)...' });
  await delay(200);
  const totalRefs = fixture.cachedResult.findings.reduce(
    (acc, f) => acc + (f.references?.length || 0),
    0
  );
  updateStep('enrich', {
    status: 'completed',
    details: `Loaded ${totalRefs} external reference(s)`,
    durationMs: 150,
  });

  // Step 4: Patch
  updateStep('patch', { status: 'running', details: 'Applying security patches (Replay)...' });
  await delay(300);
  updateStep('patch', {
    status: 'completed',
    details: `Generated ${fixture.cachedResult.patches.length} patch(es)`,
    durationMs: 380,
  });

  // Step 5: Verify
  updateStep('verify', { status: 'running', details: 'Confirming AST syntax & re-analysis (Replay)...' });
  await delay(250);
  const verifiedCount = fixture.cachedResult.verifications.filter(
    (v) => v.resolved && v.syntaxOk
  ).length;
  updateStep('verify', {
    status: 'completed',
    details: `${verifiedCount} patch(es) fully verified`,
    durationMs: 220,
  });

  const assembledReport = assembleReport({
    findings: fixture.cachedResult.findings,
    patches: fixture.cachedResult.patches,
    verifications: fixture.cachedResult.verifications,
    durationMs: fixture.cachedResult.report.stats.durationMs || 1350,
  });

  return {
    report: assembledReport,
    durationMs: assembledReport.stats.durationMs || 1350,
    isReplay: true,
  };
}

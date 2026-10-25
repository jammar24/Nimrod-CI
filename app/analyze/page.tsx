'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  AlertOctagon,
  Sparkles,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { InputPanel } from '@/components/InputPanel';
import { PipelineTracker } from '@/components/PipelineTracker';
import { VerdictCard } from '@/components/VerdictCard';
import { FindingCard } from '@/components/FindingCard';
import { ExportBar } from '@/components/ExportBar';
import { HistoryModal } from '@/components/HistoryModal';
import { CreatePrModal } from '@/components/CreatePrModal';
import {
  INITIAL_PIPELINE_STEPS,
  StepProgress,
  runLivePipeline,
  replayFixturePipeline,
} from '@/lib/pipeline';
import { Report, Finding, Patch } from '@/lib/schemas';
import { SECURITY_FIXTURES, SecurityFixture } from '@/lib/examples';
import { saveReportToHistory } from '@/lib/history';

export default function AnalyzePage() {
  const [pipelineSteps, setPipelineSteps] = useState<StepProgress[]>(INITIAL_PIPELINE_STEPS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<number | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentFilename, setCurrentFilename] = useState<string>('source.js');
  const [lang, setLang] = useState<'es' | 'en'>('en');

  // Load saved language preference and runtime model configuration
  useEffect(() => {
    const savedLang = localStorage.getItem('nimrod_lang') as 'es' | 'en' | null;
    if (savedLang) setLang(savedLang);

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        const fast = data?.models?.fast || data?.integrations?.nebiusTokenFactory?.fastModel;
        const primary = data?.models?.primary || data?.integrations?.nebiusTokenFactory?.primaryModel;
        if (fast && primary) {
          setPipelineSteps((prev) =>
            prev.map((step) => {
              if (step.id === 'triage') return { ...step, model: fast };
              if (step.id === 'analyze') return { ...step, model: primary };
              if (step.id === 'patch') return { ...step, model: primary };
              if (step.id === 'verify') return { ...step, model: `Compiler AST + ${fast}` };
              return step;
            })
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleLang = () => {
    const newLang = lang === 'es' ? 'en' : 'es';
    setLang(newLang);
    localStorage.setItem('nimrod_lang', newLang);
  };

  const isEs = lang === 'es';

  // GitHub integration state
  const [isCreatePrModalOpen, setIsCreatePrModalOpen] = useState(false);
  const [prModalFinding, setPrModalFinding] = useState<Finding | null>(null);
  const [prModalPatch, setPrModalPatch] = useState<Patch | null>(null);
  const [gitRepoContext, setGitRepoContext] = useState<{
    owner: string;
    repo: string;
    baseBranch: string;
    filePath: string;
    pullNumber?: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const scrollToResultsOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Handle live pipeline execution against Nebius endpoints
  const handleRunLive = async (diff: string, originalCode: string, language: string, filename?: string) => {
    setIsRunning(true);
    setErrorMessage(null);
    setReport(null);
    setIsReplayMode(false);
    setTotalDuration(undefined);
    if (filename) setCurrentFilename(filename);
    scrollToResultsOnMobile();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await runLivePipeline({
        diff,
        originalCode,
        language,
        onProgress: (updatedSteps) => setPipelineSteps(updatedSteps),
        signal: controller.signal,
      });

      setReport(result.report);
      setTotalDuration(result.durationMs);
      // Persist to local history
      saveReportToHistory(result.report, filename || 'source.js');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Pipeline error:', err);
        setErrorMessage(
          err.message ||
            (isEs
              ? 'Error al completar el pipeline de seguridad. Verifica tu NEBIUS_API_KEY en .env.local.'
              : 'Failed to complete security pipeline. Verify your NEBIUS_API_KEY in .env.local.')
        );
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Handle instant replay from precalculated fixtures
  const handleInstantReplay = async (fixture: SecurityFixture) => {
    setIsRunning(true);
    setErrorMessage(null);
    setReport(null);
    setIsReplayMode(true);
    setTotalDuration(undefined);
    setCurrentFilename(fixture.name.toLowerCase().replace(/\s+/g, '-') + '.js');
    scrollToResultsOnMobile();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await replayFixturePipeline(
        fixture,
        (updatedSteps) => setPipelineSteps(updatedSteps),
        controller.signal
      );

      setReport(result.report);
      setTotalDuration(result.durationMs);
      // Persist replay to local history
      saveReportToHistory(result.report, fixture.name.toLowerCase().replace(/\s+/g, '-') + '.js');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(
          err.message || (isEs ? 'La repetición instantánea encontró un error' : 'Instant replay encountered an error')
        );
      }
    } finally {
      setIsRunning(false);
    }
  };

  // Restore a previous report from history without re-running
  const handleRestoreFromHistory = (restoredReport: Report, filename: string) => {
    setReport(restoredReport);
    setIsReplayMode(false);
    setCurrentFilename(filename);
    setErrorMessage(null);
  };

  const handleOpenPrModal = (finding?: Finding, patch?: Patch) => {
    setPrModalFinding(finding || null);
    setPrModalPatch(patch || null);
    setIsCreatePrModalOpen(true);
  };

  // Derive patched code and verification status for InputPanel download
  const patchedCode = report?.patches?.[0]?.patchedCode;
  const isPatchedCodeVerified = report
    ? report.verifications?.length > 0 && report.verifications.every((v) => v.resolved && v.syntaxOk)
    : true;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 selection:bg-emerald-500/30 selection:text-white transition-colors font-sans">
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        lang={lang}
        onToggleLang={handleToggleLang}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectReport={handleRestoreFromHistory}
      />

      <CreatePrModal
        isOpen={isCreatePrModalOpen}
        onClose={() => setIsCreatePrModalOpen(false)}
        report={report}
        targetFinding={prModalFinding}
        targetPatch={prModalPatch}
        defaultRepo={
          gitRepoContext ? `${gitRepoContext.owner}/${gitRepoContext.repo}` : 'jammar24/Nimrod-CI'
        }
        defaultBaseBranch={gitRepoContext?.baseBranch || 'main'}
        defaultFilename={gitRepoContext?.filePath || currentFilename}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Code Diff & Before/After Input Panel (6 Cols on lg, 5 on xl) */}
          <div className="lg:col-span-6 xl:col-span-5 lg:sticky lg:top-24 min-w-0">
            <InputPanel
              onRunLive={handleRunLive}
              onInstantReplay={handleInstantReplay}
              isRunning={isRunning}
              patchedCode={patchedCode}
              isPatchedCodeVerified={isPatchedCodeVerified}
              currentFilename={currentFilename}
              lang={lang}
              onGitContextChange={(ctx) => setGitRepoContext(ctx)}
            />
          </div>

          {/* RIGHT COLUMN: Pipeline Tracker, Verdict & Findings (6 Cols on lg, 7 on xl) */}
          <div ref={resultsRef} className="lg:col-span-6 xl:col-span-7 space-y-6 min-w-0">
            {/* Error Notification Banner with Sample Result CTA */}
            {errorMessage && (
              <div
                className="p-5 rounded-2xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                role="alert"
              >
                <div className="flex items-start space-x-3">
                  <AlertOctagon className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                      {isEs ? 'Aviso de Ejecución' : 'Execution Notice'}
                    </h3>
                    <p className="text-xs text-rose-700/80 dark:text-rose-200/80 mt-0.5">{errorMessage}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleInstantReplay(SECURITY_FIXTURES[0])}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-xs font-medium whitespace-nowrap self-end sm:self-auto cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>{isEs ? 'Cargar resultado de muestra' : 'Load sample result'}</span>
                </button>
              </div>
            )}

            {/* Live 5-Step Pipeline Tracker */}
            <PipelineTracker steps={pipelineSteps} isReplay={isReplayMode} lang={lang} />

            {/* RESULTS VIEW */}
            {report ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 1. Verdict Card & Risk Meter */}
                <VerdictCard
                  verdict={report.verdict}
                  riskScore={report.riskScore}
                  summary={report.summary}
                  stats={report.stats}
                  isReplay={isReplayMode}
                  lang={lang}
                />

                {/* 2. Export and Batch Actions with Open PR Button */}
                <ExportBar
                  report={report}
                  onOpenPrModal={() => handleOpenPrModal()}
                  lang={lang}
                />

                {/* 3. Findings List or Clean State */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-300 tracking-wide uppercase">
                      {isEs
                        ? `Hallazgos de Seguridad Detallados (${report.findings.length})`
                        : `Detailed Security Findings (${report.findings.length})`}
                    </h3>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {isEs
                        ? 'Haz clic en cualquier tarjeta para ver el parche y abrir PR'
                        : 'Click any card to expand full analysis, patch diff and open PR'}
                    </span>
                  </div>

                  {report.findings.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/10 text-center flex flex-col items-center justify-center">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/20">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-200">
                        {isEs ? 'Cero Debilidades de Seguridad Detectadas' : 'Zero Security Weaknesses Detected'}
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mt-1 leading-relaxed">
                        {isEs
                          ? 'Los cambios analizados no contienen vulnerabilidades explotables, fugas de secretos ni patrones inseguros.'
                          : 'The analyzed code changes contain no exploitable vulnerabilities, secret leaks, or unsafe API patterns.'}
                      </p>
                    </div>
                  ) : (
                    report.findings.map((finding) => {
                      const patch = report.patches.find((p) => p.findingId === finding.id);
                      const verification = report.verifications.find(
                        (v) => v.findingId === finding.id
                      );
                      return (
                        <FindingCard
                          key={finding.id}
                          finding={finding}
                          patch={patch}
                          verification={verification}
                          defaultExpanded={true}
                          onOpenPrModal={(f, p) => handleOpenPrModal(f, p)}
                          lang={lang}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            ) : !isRunning ? (
              /* EMPTY STATE: Welcoming starter card */
              <div className="p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/30 backdrop-blur-sm text-center flex flex-col items-center justify-center shadow-sm dark:shadow-none">
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 mb-4">
                  <Shield className="w-10 h-10" />
                </div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {isEs ? 'Listo para Inspeccionar Cambios de Código' : 'Ready to Inspect Code Changes'}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-lg mt-2 leading-relaxed">
                  {isEs
                    ? 'Nimrod-CI ejecuta una revisión agéntica de 5 fases: Triaje → Análisis SAST → Enriquecimiento Tavily → Parcheo Autónomo → Verificación AST.'
                    : 'Nimrod-CI executes a 5-step agentic review: Triage → Deep Analysis → Tavily Enrichment → Autonomous Patching → AST & Re-analysis Verification.'}
                </p>

                <div className="mt-6 w-full max-w-md">
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-3">
                    {isEs ? 'O haz clic en un ejemplo para probar al instante:' : 'Or click an example to preview instantly:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SECURITY_FIXTURES.slice(0, 4).map((fixture) => (
                      <button
                        key={fixture.id}
                        type="button"
                        onClick={() => handleInstantReplay(fixture)}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-all group flex items-center justify-between cursor-pointer"
                      >
                        <div className="truncate pr-2">
                          <div className="text-xs font-medium text-zinc-800 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                            {fixture.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {fixture.category}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <Footer durationMs={totalDuration} isReplay={isReplayMode} lang={lang} />
    </div>
  );
}

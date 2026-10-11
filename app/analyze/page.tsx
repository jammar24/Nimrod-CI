'use client';

import React, { useState, useRef } from 'react';
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
import {
  INITIAL_PIPELINE_STEPS,
  StepProgress,
  runLivePipeline,
  replayFixturePipeline,
} from '@/lib/pipeline';
import { Report } from '@/lib/schemas';
import { SECURITY_FIXTURES, SecurityFixture } from '@/lib/examples';
import { saveReportToHistory } from '@/lib/history';

export default function Home() {
  const [pipelineSteps, setPipelineSteps] = useState<StepProgress[]>(INITIAL_PIPELINE_STEPS);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [totalDuration, setTotalDuration] = useState<number | undefined>(undefined);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentFilename, setCurrentFilename] = useState<string>('source.js');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle live pipeline execution against Nebius endpoints
  const handleRunLive = async (diff: string, originalCode: string, language: string, filename?: string) => {
    setIsRunning(true);
    setErrorMessage(null);
    setReport(null);
    setIsReplayMode(false);
    setTotalDuration(undefined);
    if (filename) setCurrentFilename(filename);

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
            'Failed to complete security pipeline. Verify your NEBIUS_API_KEY in .env.local.'
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
        setErrorMessage(err.message || 'Instant replay encountered an error');
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

  // Derive patched code from report for InputPanel download
  const patchedCode = report?.patches?.[0]?.patchedCode;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30 selection:text-white transition-colors">
      <Header onOpenHistory={() => setIsHistoryOpen(true)} />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectReport={handleRestoreFromHistory}
      />


      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Code Diff & Before/After Input Panel (5 Cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <InputPanel
              onRunLive={handleRunLive}
              onInstantReplay={handleInstantReplay}
              isRunning={isRunning}
              patchedCode={patchedCode}
              currentFilename={currentFilename}
            />
          </div>

          {/* RIGHT COLUMN: Pipeline Tracker, Verdict & Findings (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Error Notification Banner with Instant Replay CTA */}
            {errorMessage && (
              <div
                className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/30 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                role="alert"
              >
                <div className="flex items-start space-x-3">
                  <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-rose-300">
                      Execution Notice
                    </h3>
                    <p className="text-xs text-rose-200/80 mt-0.5">{errorMessage}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleInstantReplay(SECURITY_FIXTURES[0])}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-medium whitespace-nowrap self-end sm:self-auto"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Try Instant Replay</span>
                </button>
              </div>
            )}

            {/* Live 5-Step Pipeline Tracker */}
            <PipelineTracker steps={pipelineSteps} isReplay={isReplayMode} />

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
                />

                {/* 2. Export and Batch Actions */}
                <ExportBar report={report} />

                {/* 3. Findings List or Clean State */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
                      Detailed Security Findings ({report.findings.length})
                    </h3>
                    <span className="text-xs text-zinc-500">
                      Click any card to expand full analysis and patch diff
                    </span>
                  </div>

                  {report.findings.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 text-center flex flex-col items-center justify-center">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-semibold text-zinc-200">
                        Zero Security Weaknesses Detected
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-md mt-1 leading-relaxed">
                        The analyzed code changes contain no exploitable vulnerabilities,
                        secret leaks, or unsafe API patterns. Safe to merge into production.
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
                        />
                      );
                    })
                  )}
                </div>
              </div>
            ) : !isRunning ? (
              /* EMPTY STATE: Welcoming starter card */
              <div className="p-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 backdrop-blur-sm text-center flex flex-col items-center justify-center">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-emerald-400 mb-4">
                  <Shield className="w-10 h-10" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Ready to Inspect Code Changes
                </h3>
                <p className="text-xs text-zinc-400 max-w-lg mt-2 leading-relaxed">
                  Sentinel-CI executes a 5-step agentic review: Triage &rarr; Deep Analysis &rarr;
                  Tavily Enrichment &rarr; Autonomous Patching &rarr; AST & Re-analysis Verification.
                </p>

                <div className="mt-6 w-full max-w-md">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-3">
                    Or click an example to preview instantly:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SECURITY_FIXTURES.slice(0, 4).map((fixture) => (
                      <button
                        key={fixture.id}
                        type="button"
                        onClick={() => handleInstantReplay(fixture)}
                        className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/70 hover:bg-zinc-850 hover:border-zinc-700 text-left transition-all group flex items-center justify-between"
                      >
                        <div className="truncate pr-2">
                          <div className="text-xs font-medium text-zinc-300 group-hover:text-emerald-400 truncate">
                            {fixture.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {fixture.category}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <Footer durationMs={totalDuration} isReplay={isReplayMode} />
    </div>
  );
}

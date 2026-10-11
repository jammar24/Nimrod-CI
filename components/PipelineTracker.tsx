'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Circle, Clock } from 'lucide-react';
import { StepProgress } from '@/lib/pipeline';

interface PipelineTrackerProps {
  steps: StepProgress[];
  isReplay?: boolean;
}

export function PipelineTracker({ steps, isReplay }: PipelineTrackerProps) {
  return (
    <div
      className="p-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Agentic Pipeline Execution
          </h2>
          {isReplay && (
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Recorded Run
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-400">5 Autonomous Steps</span>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isPending = step.status === 'idle';
          const isRunning = step.status === 'running';
          const isCompleted = step.status === 'completed';
          const isError = step.status === 'error';

          return (
            <div key={step.id} className="relative flex items-start space-x-3 group">
              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className={`absolute left-3.5 top-8 w-0.5 h-7 transition-colors duration-300 ${
                    isCompleted ? 'bg-emerald-500/60' : 'bg-zinc-800'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Status Icon */}
              <div className="flex-shrink-0 pt-0.5">
                {isCompleted && (
                  <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                {isRunning && (
                  <div className="p-1 rounded-full bg-amber-500/10 text-amber-400 animate-spin">
                    <Loader2 className="w-5 h-5" />
                  </div>
                )}
                {isError && (
                  <div className="p-1 rounded-full bg-rose-500/10 text-rose-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                {isPending && (
                  <div className="p-1 rounded-full bg-zinc-800 text-zinc-600">
                    <Circle className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-sm font-medium transition-colors ${
                      isRunning
                        ? 'text-amber-400 font-semibold'
                        : isCompleted
                        ? 'text-zinc-200'
                        : isError
                        ? 'text-rose-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {step.title}
                  </h3>
                  {step.durationMs !== undefined && (
                    <span className="flex items-center text-[11px] text-zinc-400 space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{step.durationMs}ms</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mt-0.5">{step.description}</p>

                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800/80">
                    {step.model}
                  </span>
                  {step.details && (
                    <span
                      className={`text-[11px] truncate ${
                        isError
                          ? 'text-rose-400 font-medium'
                          : isRunning
                          ? 'text-amber-300'
                          : 'text-zinc-300'
                      }`}
                    >
                      • {step.details}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

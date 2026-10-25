'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Cpu, Terminal, ShieldCheck } from 'lucide-react';
import { Verification } from '@/lib/schemas';

interface VerifiedBadgeProps {
  verification?: Verification;
}

export function VerifiedBadge({ verification }: VerifiedBadgeProps) {
  if (!verification) {
    return null;
  }

  const isVerified = verification.resolved && verification.syntaxOk;
  const engine = verification.syntaxEngine || 'acorn';
  const engineName =
    engine === 'typescript'
      ? 'TypeScript Compiler API'
      : engine === 'acorn'
      ? 'Acorn ECMAScript AST'
      : engine === 'python-syntax'
      ? 'Python Parser'
      : 'AST Compiler';

  const isModelOnly = verification.verificationMethod === 'model_only' || engine === 'none';
  const attemptsText = `Attempts: ${verification.iterations || 1} of 2`;

  if (isVerified) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs shadow-sm shadow-emerald-950/20">
        <div className="flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ Patch Verified</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            {attemptsText}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:ml-auto">
          {!isModelOnly ? (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-emerald-500/30 text-emerald-300 font-mono"
              title="Verified using real local compiler AST (zero hallucinations)"
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              AST: {engineName} (Pass)
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-amber-500/30 text-amber-300 font-mono"
              title="Syntax check not available for Python; model re-analysis only"
            >
              <Cpu className="w-3 h-3 text-amber-400" />
              Syntax check not available for Python; model re-analysis only
            </span>
          )}

          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-emerald-500/30 text-emerald-300 font-mono"
            title="Verified via Nemotron Nano differential security re-analysis"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Security: Nemotron Re-analysis (Resolved)
          </span>
        </div>
      </div>
    );
  }

  const isConsistencyFail =
    verification.consistencyOk === false ||
    verification.notes?.toLowerCase().includes('consistency');

  const finalFailureReason =
    verification.notes ||
    (isConsistencyFail
      ? 'Patch consistency check failed'
      : !verification.syntaxOk
      ? `AST Syntax Error (${engineName})`
      : 'Security Vulnerability Persists in Patch');

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-semibold">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>⚠️ Verification Failed</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
            {attemptsText}
          </span>
        </div>
      </div>
      <div className="text-[11px] text-rose-300/90 font-mono bg-rose-950/40 p-2 rounded-lg border border-rose-500/20">
        <span className="font-semibold text-rose-200">Failure reason: </span>
        {finalFailureReason}
      </div>
    </div>
  );
}

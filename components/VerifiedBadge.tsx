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

  if (isVerified) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs shadow-sm shadow-emerald-950/20">
        <div className="flex items-center space-x-2 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>✓ Patch Verified</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            {verification.iterations} iter{verification.iterations > 1 ? 's' : ''}
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
              title="Syntax for Python was verified via model reasoning"
            >
              <Cpu className="w-3 h-3 text-amber-400" />
              Syntax: Model-only check
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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
      <div className="flex items-center space-x-2 font-semibold">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>⚠️ Verification Failed or Incomplete</span>
      </div>
      <div className="text-[11px] text-amber-300/90 font-mono sm:ml-auto">
        {!verification.syntaxOk
          ? `AST Syntax Error (${engineName})`
          : 'Security Vulnerability Persists in Patch'}
      </div>
    </div>
  );
}

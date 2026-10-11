'use client';

import React, { useState } from 'react';
import { Terminal, ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Bug, CheckCircle2, AlertOctagon } from 'lucide-react';
import { PocVerificationResult } from '@/lib/schemas';

interface PocResultCardProps {
  pocResult: PocVerificationResult;
}

export function PocResultCard({ pocResult }: PocResultCardProps) {
  const [showHarness, setShowHarness] = useState(false);

  const isVerified = pocResult.status === 'verified';
  const isStillExploitable = pocResult.status === 'still_exploitable';

  return (
    <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
            Executable Sandbox PoC Evidence
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isVerified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Exploit Neutralized
            </span>
          )}
          {isStillExploitable && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <AlertOctagon className="w-3.5 h-3.5" />
              Exploit Still Active
            </span>
          )}
          {pocResult.status === 'unreproducible' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              Unreproducible
            </span>
          )}
        </div>
      </div>

      {/* Description & Attack Payload */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
          <span className="text-zinc-400 block text-[11px] font-medium mb-1">
            Attack Objective / Description:
          </span>
          <span className="text-zinc-200">{pocResult.poc.description}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
          <span className="text-zinc-400 block text-[11px] font-medium mb-1">
            Test Payload / Attack Input:
          </span>
          <code className="text-cyan-300 font-mono text-xs break-all">
            {pocResult.poc.attackInput}
          </code>
        </div>
      </div>

      {/* Differential Before vs After Sandbox Run */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* Before Patch */}
        <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Original Code (Before)
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {pocResult.beforePatch.durationMs}ms
            </span>
          </div>
          <div className="text-rose-200/90 text-[11px]">
            {pocResult.beforePatch.exploited ? (
              <span className="font-medium text-rose-400">
                🔴 Vulnerability Triggered (Exploitable)
              </span>
            ) : (
              <span className="text-zinc-400">Not triggered</span>
            )}
          </div>
          {pocResult.beforePatch.output && (
            <pre className="mt-1.5 p-1.5 rounded bg-zinc-950/80 text-[10px] text-zinc-400 font-mono overflow-x-auto max-h-16">
              {pocResult.beforePatch.output}
            </pre>
          )}
        </div>

        {/* After Patch */}
        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Patched Code (After)
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {pocResult.afterPatch.durationMs}ms
            </span>
          </div>
          <div className="text-emerald-200/90 text-[11px]">
            {!pocResult.afterPatch.exploited ? (
              <span className="font-medium text-emerald-400">
                🟢 Attack Blocked & Sanitized
              </span>
            ) : (
              <span className="font-medium text-rose-400">
                🔴 Still Vulnerable
              </span>
            )}
          </div>
          {pocResult.afterPatch.output && (
            <pre className="mt-1.5 p-1.5 rounded bg-zinc-950/80 text-[10px] text-zinc-400 font-mono overflow-x-auto max-h-16">
              {pocResult.afterPatch.output}
            </pre>
          )}
        </div>
      </div>

      {/* Accordion Toggle for Full PoC Test Harness */}
      <div>
        <button
          onClick={() => setShowHarness(!showHarness)}
          type="button"
          className="flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer"
        >
          {showHarness ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showHarness ? 'Hide Sandbox PoC Harness Code' : 'View Sandbox PoC Harness Code'}</span>
        </button>

        {showHarness && (
          <pre className="mt-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-cyan-200/90 overflow-x-auto">
            {pocResult.poc.testHarnessCode}
          </pre>
        )}
      </div>
    </div>
  );
}

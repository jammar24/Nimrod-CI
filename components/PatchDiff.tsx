'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface PatchDiffProps {
  unifiedDiff: string;
  filename?: string;
}

export function PatchDiff({ unifiedDiff, filename }: PatchDiffProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(unifiedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = unifiedDiff.split('\n');

  return (
    <div className="w-full rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/80 border-b border-zinc-800 text-zinc-400">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-zinc-300 font-medium truncate max-w-xs sm:max-w-md">
            {filename || 'Remediation Unified Diff'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[11px]"
          title="Copy unified diff to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy patch</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3 overflow-x-auto max-h-80 select-text leading-5">
        {lines.map((line, idx) => {
          let lineClass = 'text-zinc-400';
          let bgClass = 'bg-transparent';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineClass = 'text-emerald-400';
            bgClass = 'bg-emerald-950/30';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineClass = 'text-rose-400';
            bgClass = 'bg-rose-950/30';
          } else if (line.startsWith('@@')) {
            lineClass = 'text-cyan-400';
            bgClass = 'bg-cyan-950/20';
          }

          return (
            <div key={idx} className={`${lineClass} ${bgClass} px-2 py-0.5 rounded whitespace-pre`}>
              {line || ' '}
            </div>
          );
        })}
      </div>
    </div>
  );
}

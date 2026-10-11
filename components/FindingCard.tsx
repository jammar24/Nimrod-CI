'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  AlertTriangle,
  Info,
  Shield,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { Finding, Patch, Verification, Severity } from '@/lib/schemas';
import { PatchDiff } from './PatchDiff';
import { VerifiedBadge } from './VerifiedBadge';
import { PocResultCard } from './PocResultCard';

interface FindingCardProps {
  finding: Finding;
  patch?: Patch;
  verification?: Verification;
  defaultExpanded?: boolean;
}

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; bgClass: string; textClass: string; borderClass: string; icon: any }
> = {
  critical: {
    label: 'Critical',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/30',
    icon: AlertOctagon,
  },
  high: {
    label: 'High',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  low: {
    label: 'Low',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
    icon: Info,
  },
  info: {
    label: 'Info',
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-400',
    borderClass: 'border-zinc-500/30',
    icon: Shield,
  },
};

export function FindingCard({
  finding,
  patch,
  verification,
  defaultExpanded = true,
}: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
  const SevIcon = sev.icon;

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-zinc-700/80">
      {/* Header / Accordion trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left focus:outline-none focus:bg-zinc-800/40 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center space-x-3.5 min-w-0 pr-3">
          <div className={`p-2 rounded-xl border ${sev.borderClass} ${sev.bgClass} ${sev.textClass} flex-shrink-0`}>
            <SevIcon className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-lg border ${sev.borderClass} ${sev.bgClass} ${sev.textClass}`}
              >
                {sev.label}
              </span>

              {finding.cwe && (
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {finding.cwe}
                </span>
              )}

              {finding.owasp && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-zinc-800/60 text-zinc-400 border border-zinc-700/60 hidden sm:inline-block">
                  {finding.owasp}
                </span>
              )}

              <span className="text-xs text-zinc-500 font-mono">
                {finding.file}:{finding.lineStart || 1}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-semibold text-zinc-100 mt-1 truncate">
              {finding.title}
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0 text-zinc-400">
          <span className="text-xs font-medium text-zinc-500 hidden md:inline">
            Confidence: {Math.round(finding.confidence * 100)}%
          </span>
          <div className="p-1 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <div className="px-4 pb-5 sm:px-5 border-t border-zinc-800/60 pt-4 space-y-4">
          {/* Explanation */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Vulnerability Explanation
            </h5>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/50">
              {finding.explanation}
            </p>
          </div>

          {/* Vulnerable Snippet */}
          {finding.vulnerableSnippet && (
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>Vulnerable Snippet</span>
              </div>
              <pre className="p-3 rounded-xl bg-zinc-950 font-mono text-xs text-rose-300 border border-rose-950/50 overflow-x-auto whitespace-pre-wrap">
                {finding.vulnerableSnippet}
              </pre>
            </div>
          )}

          {/* Exploit Scenario */}
          <div>
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Attack & Exploit Scenario
            </h5>
            <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
              {finding.exploitScenario}
            </div>
          </div>

          {/* Tavily References */}
          {finding.references && finding.references.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Live References & Guidance (Tavily Search)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {finding.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/70 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all flex items-start justify-between group"
                  >
                    <div className="pr-2 min-w-0">
                      <div className="text-xs font-medium text-emerald-400 group-hover:underline truncate">
                        {ref.title}
                      </div>
                      {ref.snippet && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                          {ref.snippet}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 flex-shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Remediation Patch & Verification Badge */}
          {patch && (
            <div className="pt-2 border-t border-zinc-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Autonomous Remediation Patch
                </h5>
                <VerifiedBadge verification={verification} />
              </div>

              {patch.rationale && (
                <p className="text-xs text-zinc-400 italic">
                  Fix Rationale: {patch.rationale}
                </p>
              )}

              <PatchDiff unifiedDiff={patch.unifiedDiff} filename={finding.file} />

              {verification?.pocResult && (
                <PocResultCard pocResult={verification.pocResult} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

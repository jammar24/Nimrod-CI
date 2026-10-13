'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Verdict, ReportStats } from '@/lib/schemas';
import { RiskMeter } from './RiskMeter';

interface VerdictCardProps {
  verdict: Verdict;
  riskScore: number;
  summary: string;
  stats: ReportStats;
  isReplay?: boolean;
  lang?: 'es' | 'en';
}

export function VerdictCard({
  verdict,
  riskScore,
  summary,
  stats,
  isReplay,
  lang = 'es',
}: VerdictCardProps) {
  const isEs = lang === 'es';

  const configs = {
    block: {
      title: isEs ? 'BLOQUEAR MERGE' : 'BLOCK MERGE',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      borderClass: 'border-rose-500/40',
      bgGlow: 'from-rose-500/10 to-transparent',
      icon: ShieldAlert,
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    review: {
      title: isEs ? 'REVISIÓN MANUAL' : 'MANUAL REVIEW',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      borderClass: 'border-amber-500/40',
      bgGlow: 'from-amber-500/10 to-transparent',
      icon: AlertTriangle,
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    pass: {
      title: isEs ? 'APROBADO Y SEGURO' : 'PASS & SAFE',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      borderClass: 'border-emerald-500/40',
      bgGlow: 'from-emerald-500/10 to-transparent',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
  };

  const current = configs[verdict] || configs.pass;
  const Icon = current.icon;

  return (
    <div
      className={`p-6 rounded-2xl border ${current.borderClass} bg-gradient-to-b ${current.bgGlow} bg-white/95 dark:bg-zinc-900/60 backdrop-blur-md relative overflow-hidden transition-all duration-300 shadow-sm dark:shadow-none`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 ${current.iconColor}`}>
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${current.badgeClass}`}
              >
                {current.title}
              </span>
              {isReplay && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {isEs ? 'Ejecución Grabada' : 'Recorded Run'}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              {isEs ? 'Evaluación de Seguridad Sentinel' : 'Sentinel Security Assessment'}
            </h3>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center space-x-2 text-xs bg-zinc-100/90 dark:bg-zinc-950/80 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800/80 self-start sm:self-auto">
          <div>
            <span className="text-zinc-500">{isEs ? 'Hallazgos: ' : 'Findings: '}</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stats.totalFindings}</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <div>
            <span className="text-zinc-500">{isEs ? 'Parcheados: ' : 'Patched: '}</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {stats.verifiedPatchesCount}/{stats.totalFindings}
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-6 bg-zinc-50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/50">
        {summary}
      </p>

      {/* Visual Risk Meter */}
      <RiskMeter score={riskScore} />
    </div>
  );
}

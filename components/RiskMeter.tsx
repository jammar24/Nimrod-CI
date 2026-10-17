'use client';

import React, { useState, useEffect } from 'react';

export interface RiskMeterProps {
  score: number; // Residual score (0..100)
  detectedScore?: number; // Initial severity score of detected flaws
  isMitigated?: boolean; // Whether findings are fully patched and verified
  totalFindings?: number;
  isLoading?: boolean;
  lang?: 'es' | 'en';
}

export function RiskMeter({
  score,
  detectedScore,
  isMitigated = false,
  totalFindings = 0,
  isLoading = false,
  lang = 'es',
}: RiskMeterProps) {
  const isEs = lang === 'es';

  // Determine which score to use for the visual fill
  // If vulnerabilities were detected, fill according to what came out (detectedScore),
  // but style with an emerald/teal mitigation theme if all patches were verified!
  const effectiveScore = isMitigated && detectedScore !== undefined && detectedScore > 0
    ? detectedScore
    : Math.min(100, Math.max(0, score));

  const boundedScore = Math.min(100, Math.max(0, effectiveScore));

  // Fluid loading animation states
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const [displayedNumber, setDisplayedNumber] = useState(0);

  useEffect(() => {
    // Reset to 0 when score changes, then trigger smooth fluid load
    setAnimatedWidth(0);
    setDisplayedNumber(0);

    const animationDuration = 950; // ms
    let startTime: number | null = null;
    let animId: number;

    const timer = setTimeout(() => {
      setAnimatedWidth(boundedScore);
    }, 60);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      // Ease out cubic: 1 - (1 - progress)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayedNumber(Math.round(ease * boundedScore));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayedNumber(boundedScore);
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
    };
  }, [boundedScore]);

  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let badgeText = isEs ? 'Seguro / Bajo Riesgo' : 'Safe / Low Risk';

  if (isMitigated && totalFindings > 0) {
    // When vulnerabilities were detected and verified-patched
    barColor = 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-sm shadow-emerald-500/20';
    textColor = 'text-emerald-400';
    badgeText = isEs
      ? `${displayedNumber}/100 · Riesgo Mitigado (Parche Verificado)`
      : `${displayedNumber}/100 · Risk Mitigated (Verified Patch)`;
  } else if (boundedScore > 50) {
    barColor = 'bg-gradient-to-r from-rose-600 to-rose-500 shadow-sm shadow-rose-500/30';
    textColor = 'text-rose-400';
    badgeText = isEs
      ? `${displayedNumber}/100 · Riesgo Severo (Bloquear Merge)`
      : `${displayedNumber}/100 · Severe Security Risk (Block Merge)`;
  } else if (boundedScore > 15) {
    barColor = 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-sm shadow-amber-500/30';
    textColor = 'text-amber-400';
    badgeText = isEs
      ? `${displayedNumber}/100 · Riesgo Moderado (Revisión Manual)`
      : `${displayedNumber}/100 · Moderate Risk (Manual Review)`;
  } else {
    barColor = 'bg-emerald-500';
    textColor = 'text-emerald-400';
    badgeText = isEs
      ? `${displayedNumber}/100 · Seguro / Zero Riesgo`
      : `${displayedNumber}/100 · Safe / Zero Risk`;
  }

  // Minimum visual width so the bar is visible and fluidly fills
  const visualWidth = animatedWidth === 0 ? '0%' : `${animatedWidth}%`;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-medium gap-1 mb-1.5">
        <span className="text-zinc-400">
          {isEs ? 'Medidor de Riesgo de Seguridad (0 – 100)' : 'Security Risk Meter (0 – 100)'}
        </span>
        <span className={`${textColor} font-bold text-xs sm:text-sm`}>
          {badgeText}
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-3.5 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800/90 relative shadow-inner">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
          style={{ width: visualWidth }}
        >
          {/* Subtle animated shimmer shine across the bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer" />
        </div>
      </div>

      {/* Informative Sub-Labels */}
      <div className="flex justify-between text-[10px] text-zinc-400 mt-1.5 font-mono">
        <span>0 ({isEs ? 'Zero Riesgo' : 'Zero Risk'})</span>
        <span className="hidden sm:inline">50 ({isEs ? 'Moderado' : 'Moderate'})</span>
        <span>100 ({isEs ? 'Crítico' : 'Highest'})</span>
      </div>

      {/* When mitigated by verified patch, show comparative explanation */}
      {isMitigated && totalFindings > 0 && (
        <div className="mt-2 text-[11px] text-emerald-400/90 font-mono flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
          <span>🛡️</span>
          <span>
            {isEs
              ? `Riesgo detectado en código: ${boundedScore}/100 ➔ Riesgo residual: 0/100 (Seguro con parche verificado)`
              : `Code vulnerability risk: ${boundedScore}/100 ➔ Residual risk: 0/100 (Safe with verified patch)`}
          </span>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';

interface RiskMeterProps {
  score: number; // 0..100, where 100 = highest risk
}

export function RiskMeter({ score }: RiskMeterProps) {
  const boundedScore = Math.min(100, Math.max(0, score));

  // Determine color and status description
  let barColor = 'bg-emerald-500';
  let textColor = 'text-emerald-400';
  let badgeText = 'Safe / Low Risk';

  if (boundedScore > 50) {
    barColor = 'bg-rose-500';
    textColor = 'text-rose-400';
    badgeText = 'Severe Security Risk';
  } else if (boundedScore > 15) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-400';
    badgeText = 'Moderate Risk';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-medium mb-1.5">
        <span className="text-zinc-400">Risk Meter (0 – 100)</span>
        <span className={`${textColor} font-bold text-sm`}>
          {boundedScore}/100 · {badgeText}
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${boundedScore}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-zinc-400 mt-1 font-mono">
        <span>0 (Zero Risk)</span>
        <span>50 (Moderate)</span>
        <span>100 (Highest Risk)</span>
      </div>
    </div>
  );
}

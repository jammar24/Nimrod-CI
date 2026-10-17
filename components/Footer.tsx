'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, Zap } from 'lucide-react';

interface FooterProps {
  durationMs?: number;
  isReplay?: boolean;
  lang?: 'en' | 'es';
}

export function Footer({ durationMs, isReplay, lang = 'en' }: FooterProps) {
  const isEs = lang === 'es';
  const [models, setModels] = useState<{ fast: string; primary: string }>({
    fast: 'Loading...',
    primary: 'Loading...',
  });

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.models) {
          setModels(data.models);
        }
      })
      .catch(() => {
        setModels({ fast: 'not configured', primary: 'not configured' });
      });
  }, []);

  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-md py-6 mt-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>
            Nimrod-CI · {isEs ? 'Potenciado por' : 'Powered by'}{' '}
            <strong className="text-zinc-900 dark:text-zinc-200">Nebius Token Factory</strong> {isEs ? 'y' : 'and'}{' '}
            <strong className="text-zinc-900 dark:text-zinc-200">NVIDIA Nemotron</strong>
          </span>
          {isReplay && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold">
              <span className="sm:hidden">{isEs ? 'Muestra' : 'Sample'}</span>
              <span className="hidden sm:inline">
                {isEs
                  ? 'Resultado de muestra (ejemplo pre-cargado)'
                  : 'Sample result (pre-loaded example)'}
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div>
            <span>{isEs ? 'Triaje y Verificación: ' : 'Triage & Verification: '}</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-300">{models.fast}</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div>
            <span>{isEs ? 'Análisis y Parcheo: ' : 'Analysis & Patching: '}</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-300">{models.primary}</span>
          </div>
          <span className="hidden sm:inline">•</span>
          <div>
            <span>{isEs ? 'Enriquecimiento: ' : 'Enrichment: '}</span>
            <span className="font-mono text-zinc-800 dark:text-zinc-300">Tavily Search</span>
          </div>
          {durationMs !== undefined && (
            <>
              <span className="hidden sm:inline">•</span>
              <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                <Zap className="w-3 h-3" />
                <span>Total: {durationMs}ms</span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 text-center text-[11px] text-zinc-500">
        {isEs ? 'Creado por' : 'Built by'}{' '}
        <a href="https://github.com/jammar24" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors font-medium">
          Jamar Masias - @jammar24
        </a>{' '}
        · MIT License
      </div>
    </footer>
  );
}

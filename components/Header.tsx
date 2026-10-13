'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, GitPullRequest, ExternalLink, History, Home, Globe } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenHistory?: () => void;
  lang?: 'es' | 'en';
  onToggleLang?: () => void;
}

export function Header({ onOpenHistory, lang = 'es', onToggleLang }: HeaderProps) {
  const isEs = lang === 'es';

  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Clickable Brand / Logo leading back to Home */}
        <Link
          href="/"
          className="flex items-center space-x-3 min-w-0 group cursor-pointer hover:opacity-90 transition-opacity"
          title={isEs ? 'Ir a la página principal' : 'Go to Home'}
        >
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                Sentinel-CI
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                Agentic CI/CD
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden md:block truncate">
              {isEs
                ? 'Revisor de seguridad autónomo: detecta fallas, sintetiza parches y verifica con AST + PoC'
                : 'Autonomous security reviewer: finds flaws, synthesizes patches, and verifies with AST + PoC'}
            </p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* Back to Home Button */}
          <Link
            href="/"
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-500 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-900/80 transition-all cursor-pointer shadow-xs"
            title={isEs ? 'Regresar a la página principal' : 'Return to Home'}
          >
            <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{isEs ? 'Inicio' : 'Home'}</span>
          </Link>

          {/* Translation Button */}
          {onToggleLang && (
            <button
              onClick={onToggleLang}
              type="button"
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-500 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-900/80 transition-all cursor-pointer shadow-xs"
              title={isEs ? 'Switch to English' : 'Cambiar a Español'}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isEs ? 'EN' : 'ES'}</span>
            </button>
          )}

          {/* History Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              type="button"
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-500 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-900/80 transition-all cursor-pointer shadow-xs"
              title={isEs ? 'Historial de análisis local' : 'Local analysis history'}
            >
              <History className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden md:inline">{isEs ? 'Historial' : 'History'}</span>
            </button>
          )}

          {/* Nebius Badge */}
          <div className="hidden xl:flex items-center space-x-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100/80 dark:bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Nebius Token Factory · Nemotron</span>
          </div>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/jammar24/sentinel-ci-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300 dark:hover:border-zinc-500 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/80 dark:bg-zinc-900/80 transition-all duration-150 shadow-xs"
            title="GitHub Repository"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          </a>

          {/* Theme Toggle (Light / Dark) */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

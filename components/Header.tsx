'use client';

import React from 'react';
import { ShieldCheck, GitPullRequest, ExternalLink, History } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onOpenHistory?: () => void;
}

export function Header({ onOpenHistory }: HeaderProps) {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 transition-colors dark:bg-zinc-950/90 dark:border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-100 truncate">
                Sentinel-CI
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Agentic CI/CD
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden md:block truncate">
              Autonomous security reviewer: finds flaws, synthesizes patches, and verifies with AST + PoC
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              type="button"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-700/60 hover:border-zinc-500 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 transition-all cursor-pointer"
              title="Open Local Analysis History"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          <div className="hidden lg:flex items-center space-x-2 text-xs font-medium text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-lg border border-zinc-800">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Nebius Token Factory · Nemotron</span>
          </div>

          <a
            href="https://github.com/jammar24/-sentinel-ci"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-700/60 hover:border-zinc-500 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 transition-all duration-150"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">GitHub</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

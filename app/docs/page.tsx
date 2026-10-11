'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ShieldCheck, GitPullRequest, ArrowLeft } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-zinc-900 dark:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">Sentinel-CI Docs</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <Link href="/" className="hover:text-zinc-900 dark:text-white transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
            <Link href="/analyze" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Try it now
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-white mb-8">Documentation</h1>
        
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">How the Pipeline Works</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            Sentinel-CI uses a multi-stage agentic pipeline. Findings are re-checked after patching to reduce false positives. Each step uses a specialized NVIDIA Nemotron model hosted on Nebius Token Factory.
          </p>
          
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">1. Triage</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Quickly scans the code diff for potential security patterns and filters out safe changes.
              </p>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded-lg inline-block">
                Model: {process.env.NEBIUS_MODEL_FAST || 'NEBIUS_MODEL_FAST (not configured)'}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">2. Deep Analysis</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Conducts a comprehensive vulnerability assessment using a highly capable reasoning model to verify exploitable vectors.
              </p>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded-lg inline-block">
                Model: {process.env.NEBIUS_MODEL_PRIMARY || 'NEBIUS_MODEL_PRIMARY (not configured)'}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">3. Web Enrichment</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Fetches CWE/OWASP references and current sources via Tavily.
              </p>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded-lg inline-block">
                Integration: Tavily Search API
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">4. Autonomous Patching</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Generates a precise code diff that fixes the vulnerability without altering business logic.
              </p>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded-lg inline-block">
                Model: {process.env.NEBIUS_MODEL_PRIMARY || 'NEBIUS_MODEL_PRIMARY (not configured)'}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">5. Verification</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Verification: apply the patch, run a syntax check (Acorn / TS Compiler AST), re-analyze the patched code with the model, retry up to 2 times.
              </p>
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-500 bg-white dark:bg-zinc-950 p-2 rounded-lg inline-block">
                Model: {process.env.NEBIUS_MODEL_FAST || 'NEBIUS_MODEL_FAST (not configured)'}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">Report Format</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
            Upon completion, Sentinel-CI generates a structured JSON report detailing findings, risk metrics, and the proposed patches.
          </p>
          <pre className="bg-zinc-50 dark:bg-zinc-900/80 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto">
{`{
  "id": "rep_12345",
  "verdict": "VULNERABLE",
  "riskScore": 85,
  "summary": "Found critical SQL Injection...",
  "findings": [
    {
      "id": "fnd_001",
      "severity": "CRITICAL",
      "title": "SQL Injection in User Auth",
      "description": "Unsanitized input..."
    }
  ],
  "patches": [
    {
      "findingId": "fnd_001",
      "patchedCode": "..."
    }
  ],
  "stats": {
    "totalAnalyzed": 1,
    "criticalFound": 1,
    "highFound": 0
  }
}`}
          </pre>
        </section>

        <section id="api" className="mb-16">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-2">API Endpoints (Read-Only)</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            Sentinel-CI exposes internal endpoints for the pipeline stages. Authentication is handled internally.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">POST</span>
                <code className="text-zinc-800 dark:text-zinc-200 font-mono text-sm">/api/pipeline/triage</code>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Accepts a code diff and returns a boolean indicating if deeper analysis is required.</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">POST</span>
                <code className="text-zinc-800 dark:text-zinc-200 font-mono text-sm">/api/pipeline/analyze</code>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Performs comprehensive vulnerability detection on the provided snippet.</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">POST</span>
                <code className="text-zinc-800 dark:text-zinc-200 font-mono text-sm">/api/pipeline/patch</code>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Generates a secure replacement for the identified vulnerability.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Sentinel-CI</span>
          </div>
          
          <div className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">
            Powered by Nebius Token Factory · NVIDIA Nemotron · Tavily
          </div>

          <div className="flex items-center space-x-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="https://github.com/jammar24/-sentinel-ci" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:text-white transition-colors">
              Repository
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Download, FileText, Copy, Check, Printer, GitPullRequest, Shield } from 'lucide-react';
import { Report } from '@/lib/schemas';
import { formatMarkdownReport, formatJsonReport, formatHtmlReport, formatSarifReport } from '@/lib/report';

interface ExportBarProps {
  report: Report;
  onOpenPrModal?: () => void;
  lang?: 'es' | 'en';
}

export function ExportBar({ report, onOpenPrModal, lang = 'es' }: ExportBarProps) {
  const isEs = lang === 'es';
  const [copiedAll, setCopiedAll] = useState(false);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const md = formatMarkdownReport(report);
    downloadFile(md, 'nimrod-ci-report.md', 'text/markdown');
  };

  const handleExportHtml = () => {
    const html = formatHtmlReport(report);
    downloadFile(html, 'nimrod-ci-report.html', 'text/html');
  };

  const handleExportJson = () => {
    const json = formatJsonReport(report);
    downloadFile(json, 'nimrod-ci-report.json', 'application/json');
  };

  const handleExportSarif = () => {
    const sarif = formatSarifReport(report);
    downloadFile(sarif, 'nimrod-report.sarif', 'application/json');
  };

  const handleCopyAllPatches = () => {
    if (!report.patches || report.patches.length === 0) return;
    const allDiffs = report.patches
      .map((p) => `# Patch for Finding ${p.findingId}:\n${p.unifiedDiff}\n`)
      .join('\n');
    navigator.clipboard.writeText(allDiffs);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/40 backdrop-blur-sm shadow-sm dark:shadow-none transition-colors">
      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-300">
        {isEs ? 'Exportar Informe y Acciones' : 'Report Export & Actions'}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* GitHub Pull Request CTA */}
        {report.patches && report.patches.length > 0 && onOpenPrModal && (
          <button
            onClick={onOpenPrModal}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-white transition-all text-xs font-semibold focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs"
            title={isEs ? 'Crear Pull Request en GitHub con los parches verificados' : 'Commit verified patches into a new branch and open a Pull Request on GitHub'}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isEs ? 'Crear Pull Request' : 'Create Pull Request'}</span>
          </button>
        )}

        <button
          onClick={handleExportMarkdown}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs"
          title="Download report formatted in GitHub-compatible Markdown"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Export Markdown</span>
        </button>

        <button
          onClick={handleExportHtml}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs"
          title="Download printable, self-contained HTML report (PDF-ready)"
        >
          <Printer className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Export HTML / PDF</span>
        </button>

        <button
          onClick={handleExportJson}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs"
          title="Download raw structured JSON report"
        >
          <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Export JSON</span>
        </button>

        <button
          onClick={handleExportSarif}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs"
          title="Download OASIS SARIF v2.1.0 standard report for GitHub Code Scanning"
        >
          <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Export SARIF</span>
        </button>

        {report.patches && report.patches.length > 0 && (
          <button
            onClick={handleCopyAllPatches}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer shadow-xs"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400">{isEs ? 'Parches Copiados' : 'All Patches Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>{isEs ? 'Copiar Todos los Parches' : 'Copy All Patches'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Download, FileText, Copy, Check, Printer } from 'lucide-react';
import { Report } from '@/lib/schemas';
import { formatMarkdownReport, formatJsonReport, formatHtmlReport } from '@/lib/report';

interface ExportBarProps {
  report: Report;
}

export function ExportBar({ report }: ExportBarProps) {
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
    downloadFile(md, 'sentinel-ci-report.md', 'text/markdown');
  };

  const handleExportHtml = () => {
    const html = formatHtmlReport(report);
    downloadFile(html, 'sentinel-ci-report.html', 'text/html');
  };

  const handleExportJson = () => {
    const json = formatJsonReport(report);
    downloadFile(json, 'sentinel-ci-report.json', 'application/json');
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
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm">
      <div className="text-xs font-semibold text-zinc-300">
        Report Export & Actions
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleExportMarkdown}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          title="Download report formatted in GitHub-compatible Markdown"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Markdown</span>
        </button>

        <button
          onClick={handleExportHtml}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          title="Download printable, self-contained HTML report (PDF-ready)"
        >
          <Printer className="w-3.5 h-3.5 text-purple-400" />
          <span>Export HTML / PDF</span>
        </button>

        <button
          onClick={handleExportJson}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          title="Download raw structured JSON report"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export JSON</span>
        </button>

        {report.patches && report.patches.length > 0 && (
          <button
            onClick={handleCopyAllPatches}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all text-xs font-medium focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">All Patches Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy All Patches</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

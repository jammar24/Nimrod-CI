'use client';

import React, { useState, useRef } from 'react';
import { Play, Zap, FileCode2, ArrowLeftRight, Sparkles, Upload, Download, Check, AlertCircle, FileText } from 'lucide-react';
import { SECURITY_FIXTURES, SecurityFixture } from '@/lib/examples';

interface InputPanelProps {
  onRunLive: (diff: string, originalCode: string, language: string, filename?: string) => void;
  onInstantReplay: (fixture: SecurityFixture) => void;
  isRunning: boolean;
  patchedCode?: string;
  currentFilename?: string;
}

export function InputPanel({
  onRunLive,
  onInstantReplay,
  isRunning,
  patchedCode,
  currentFilename = 'source.js',
}: InputPanelProps) {
  const [mode, setMode] = useState<'diff' | 'file' | 'before_after'>('diff');
  const [language, setLanguage] = useState<string>('javascript');
  const [diffInput, setDiffInput] = useState<string>(SECURITY_FIXTURES[0].diff);
  const [originalCodeInput, setOriginalCodeInput] = useState<string>(
    SECURITY_FIXTURES[0].originalCode
  );
  const [afterCodeInput, setAfterCodeInput] = useState<string>('');
  const [selectedFixture, setSelectedFixture] = useState<SecurityFixture | null>(
    SECURITY_FIXTURES[0]
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadedPatched, setDownloadedPatched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const maxChars = 20000;
  const currentChars =
    mode === 'diff'
      ? diffInput.length
      : mode === 'file'
      ? originalCodeInput.length
      : originalCodeInput.length + afterCodeInput.length;
  const isOverLimit = currentChars > maxChars;

  const handleSelectExample = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fixtureId = e.target.value;
    const found = SECURITY_FIXTURES.find((f) => f.id === fixtureId);
    if (found) {
      setSelectedFixture(found);
      setLanguage(found.language);
      setDiffInput(found.diff);
      setOriginalCodeInput(found.originalCode);
      setUploadedFileName(null);
      setFileError(null);
    } else {
      setSelectedFixture(null);
    }
  };

  const processUploadedFile = (file: File) => {
    setFileError(null);
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.mjs', '.cjs'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setFileError(`Unsupported extension. Allowed: ${validExtensions.join(', ')}`);
      return;
    }

    if (file.size > 100 * 1024) {
      setFileError('File exceeds 100 KB maximum size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const ext = file.name.split('.').pop()?.toLowerCase();
      let detectedLang = 'javascript';
      if (ext === 'ts' || ext === 'tsx') detectedLang = 'typescript';
      if (ext === 'py') detectedLang = 'python';

      setLanguage(detectedLang);
      setOriginalCodeInput(content);
      setUploadedFileName(file.name);
      setSelectedFixture(null);

      // Generate a unified diff against an empty baseline so the entire file is reviewed
      const lines = content.split('\n');
      const diffHeader = `--- a/${file.name}\n+++ b/${file.name}\n@@ -1,${lines.length} +1,${lines.length} @@\n`;
      const diffBody = lines.map((l) => '+' + l).join('\n');
      setDiffInput(diffHeader + diffBody);
    };
    reader.onerror = () => {
      setFileError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadPatchedFile = () => {
    if (!patchedCode) return;
    const blob = new Blob([patchedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = uploadedFileName || currentFilename || 'patched-code.js';
    const parts = baseName.split('.');
    const ext = parts.pop();
    link.download = `${parts.join('.')}.patched.${ext || 'js'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedPatched(true);
    setTimeout(() => setDownloadedPatched(false), 2500);
  };

  const handleRunLiveClick = () => {
    const filename = uploadedFileName || 'source.js';
    if (mode === 'diff' || mode === 'file') {
      onRunLive(diffInput, originalCodeInput, language, filename);
    } else {
      const synthDiff = `--- a/code.${language === 'python' ? 'py' : 'js'}\n+++ b/code.${language === 'python' ? 'py' : 'js'}\n${diffInput || afterCodeInput}`;
      onRunLive(synthDiff, originalCodeInput, language, filename);
    }
  };

  return (
    <div className="w-full flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-4 sm:p-5 h-full">
      {/* Top Controls: Mode Switcher & Example Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
        {/* Mode Toggle */}
        <div className="flex p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 self-start overflow-x-auto max-w-full shrink-0">
          <button
            type="button"
            onClick={() => setMode('diff')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'diff'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Unified Diff</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'file'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('before_after')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'before_after'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Before / After</span>
          </button>
        </div>

        {/* Load Example Dropdown */}
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <label htmlFor="example-select" className="text-xs font-medium text-zinc-300 shrink-0">
            Load example:
          </label>
          <select
            id="example-select"
            value={selectedFixture?.id || ''}
            onChange={handleSelectExample}
            className="text-xs font-medium bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full sm:w-auto"
          >
            {SECURITY_FIXTURES.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Language Selector & Character Counter */}
      <div className="flex flex-wrap items-center justify-between py-3 text-xs text-zinc-400 gap-2">
        <div className="flex items-center space-x-2">
          <span>Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="auto">Auto-detect</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 font-mono text-[11px]">
          <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
            {currentChars.toLocaleString()} / {maxChars.toLocaleString()} chars
          </span>
        </div>
      </div>

      {/* File Upload Mode Dropzone */}
      {mode === 'file' && (
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processUploadedFile(e.target.files[0]);
              }
            }}
            accept=".js,.jsx,.ts,.tsx,.py,.mjs,.cjs"
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
            }`}
          >
            <Upload className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-xs font-semibold text-zinc-200">
              {uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Drop code file here or tap to browse'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Supports .js, .ts, .py (up to 100 KB). Analyzes full source code.
            </p>
          </div>

          {fileError && (
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      )}

      {/* Code Textarea / Editors */}
      <div className="flex-1 flex flex-col min-h-[220px]">
        {mode === 'diff' || mode === 'file' ? (
          <div className="flex-1 flex flex-col">
            <textarea
              value={diffInput}
              onChange={(e) => {
                setDiffInput(e.target.value);
                setSelectedFixture(null);
              }}
              placeholder="Paste unified diff (--- a/file +++ b/file @@ ... @@) or code..."
              spellCheck={false}
              className="w-full flex-1 p-3.5 rounded-xl bg-zinc-950 font-mono text-base sm:text-xs text-zinc-200 border border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none leading-relaxed"
            />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Original Code (Before)
              </span>
              <textarea
                value={originalCodeInput}
                onChange={(e) => {
                  setOriginalCodeInput(e.target.value);
                  setSelectedFixture(null);
                }}
                placeholder="Original vulnerable code snippet..."
                spellCheck={false}
                className="w-full flex-1 p-3 rounded-xl bg-zinc-950 font-mono text-base sm:text-xs text-zinc-200 border border-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Modified Code (After)
              </span>
              <textarea
                value={afterCodeInput}
                onChange={(e) => setAfterCodeInput(e.target.value)}
                placeholder="New/changed code to inspect..."
                spellCheck={false}
                className="w-full flex-1 p-3 rounded-xl bg-zinc-950 font-mono text-base sm:text-xs text-zinc-200 border border-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Stacked on mobile, aligned on desktop */}
      <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {patchedCode && (
            <button
              type="button"
              onClick={handleDownloadPatchedFile}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all cursor-pointer"
              title="Download patched file ready to commit"
            >
              {downloadedPatched ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Patched File</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Instant Replay Button */}
          {selectedFixture && (
            <button
              type="button"
              disabled={isRunning}
              onClick={() => onInstantReplay(selectedFixture)}
              className="min-h-[44px] flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-cyan-950/20"
              title="Instant replay precalculated run without using API credits"
            >
              <Zap className="w-4 h-4 fill-cyan-400" />
              <span>Instant Replay (0 Credits)</span>
            </button>
          )}

          {/* Run Live Button */}
          <button
            type="button"
            disabled={isRunning || isOverLimit || !diffInput.trim()}
            onClick={handleRunLiveClick}
            className="min-h-[44px] flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <Play className="w-4 h-4 fill-zinc-950" />
            <span>{isRunning ? 'Analyzing Code...' : 'Run Live Analysis'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

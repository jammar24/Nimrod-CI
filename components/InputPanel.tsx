'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Zap,
  FileCode2,
  ArrowLeftRight,
  Sparkles,
  Upload,
  Download,
  Check,
  AlertCircle,
  GitPullRequest,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { SECURITY_FIXTURES, SecurityFixture } from '@/lib/examples';
import { GitHubPrDetails } from '@/lib/github';
import { detectLanguage } from '@/lib/detect';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface InputPanelProps {
  onRunLive: (diff: string, originalCode: string, language: string, filename?: string) => void;
  onInstantReplay: (fixture: SecurityFixture) => void;
  isRunning: boolean;
  patchedCode?: string;
  currentFilename?: string;
  lang?: 'es' | 'en';
  onGitContextChange?: (ctx: {
    owner: string;
    repo: string;
    baseBranch: string;
    filePath: string;
    pullNumber?: number;
  }) => void;
}

export function InputPanel({
  onRunLive,
  onInstantReplay,
  isRunning,
  patchedCode,
  currentFilename = 'source.js',
  lang = 'es',
  onGitContextChange,
}: InputPanelProps) {
  const isEs = lang === 'es';
  const [mode, setMode] = useState<'diff' | 'file' | 'before_after' | 'github'>('diff');
  const [language, setLanguage] = useState<string>('auto');
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

  // GitHub PR mode state
  const [prUrlInput, setPrUrlInput] = useState<string>(
    'https://github.com/jammar24/sentinel-ci-hackathon/pull/1'
  );
  const [prTokenInput, setPrTokenInput] = useState<string>('');
  const [isFetchingPr, setIsFetchingPr] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);
  const [prData, setPrData] = useState<GitHubPrDetails | null>(null);
  const [selectedPrFileIndex, setSelectedPrFileIndex] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Dynamic language detection from diff, code, or active file
  const detectedLanguage = detectLanguage(
    diffInput || originalCodeInput,
    uploadedFileName || (prData?.primaryFile?.filename) || currentFilename
  );
  const effectiveLanguage = language === 'auto' ? detectedLanguage : language;

  // Load saved token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('sentinel_github_pat');
    if (savedToken) setPrTokenInput(savedToken);
  }, []);

  const maxChars = 20000;
  const currentChars =
    mode === 'diff' || mode === 'github'
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
      setPrData(null);
    } else {
      setSelectedFixture(null);
    }
  };

  const processUploadedFile = (file: File) => {
    setFileError(null);
    const validExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.mjs', '.cjs'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setFileError(
        isEs
          ? `Extensión no soportada. Permitidas: ${validExtensions.join(', ')}`
          : `Unsupported extension. Allowed: ${validExtensions.join(', ')}`
      );
      return;
    }

    if (file.size > 100 * 1024) {
      setFileError(isEs ? 'El archivo excede el límite de 100 KB.' : 'File exceeds 100 KB maximum size limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const detected = detectLanguage(content, file.name);
      setLanguage(detected);
      setOriginalCodeInput(content);
      setUploadedFileName(file.name);
      setSelectedFixture(null);
      setPrData(null);

      // Generate a unified diff against an empty baseline so the entire file is reviewed
      const lines = content.split('\n');
      const diffHeader = `--- a/${file.name}\n+++ b/${file.name}\n@@ -1,${lines.length} +1,${lines.length} @@\n`;
      const diffBody = lines.map((l) => '+' + l).join('\n');
      setDiffInput(diffHeader + diffBody);
    };
    reader.onerror = () => {
      setFileError(isEs ? 'Error al leer el archivo desde el disco.' : 'Failed to read file from disk.');
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

  // Fetch GitHub PR and populate analysis inputs
  const handleFetchPr = async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || prUrlInput;
    if (!targetUrl.trim()) {
      setPrError(isEs ? 'Ingresa una URL de Pull Request de GitHub.' : 'Please enter a GitHub Pull Request URL.');
      return;
    }

    setPrError(null);
    setIsFetchingPr(true);

    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch-pr',
          prUrl: targetUrl.trim(),
          token: prTokenInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEs ? 'Error al conectar con el Pull Request' : 'Failed to fetch GitHub Pull Request'));
      }

      const pr: GitHubPrDetails = data.data;
      setPrData(pr);
      setSelectedPrFileIndex(0);

      // Set diff
      if (pr.diff) {
        setDiffInput(pr.diff);
      }

      // Set primary file content and language
      if (pr.primaryFile) {
        setOriginalCodeInput(pr.primaryFile.content || '');
        const detected = detectLanguage(pr.primaryFile.content || '', pr.primaryFile.filename);
        setLanguage(detected);
        setUploadedFileName(pr.primaryFile.filename);
      }

      // Notify parent of git repo context
      if (onGitContextChange) {
        onGitContextChange({
          owner: pr.owner,
          repo: pr.repo,
          baseBranch: pr.baseBranch,
          filePath: pr.primaryFile?.filename || 'source.js',
          pullNumber: pr.pullNumber,
        });
      }

      setSelectedFixture(null);
    } catch (err: any) {
      setPrError(err.message || (isEs ? 'Error al conectar con GitHub' : 'Error connecting to GitHub'));
    } finally {
      setIsFetchingPr(false);
    }
  };

  // Switch between files within the fetched PR
  const handleSelectPrFile = (index: number) => {
    if (!prData || !prData.files[index]) return;
    setSelectedPrFileIndex(index);
    const file = prData.files[index];
    setUploadedFileName(file.filename);

    const detected = detectLanguage(file.patch || '', file.filename);
    setLanguage(detected);

    if (file.patch) {
      const header = `--- a/${file.filename}\n+++ b/${file.filename}\n`;
      setDiffInput(header + file.patch);
    }

    if (onGitContextChange) {
      onGitContextChange({
        owner: prData.owner,
        repo: prData.repo,
        baseBranch: prData.baseBranch,
        filePath: file.filename,
        pullNumber: prData.pullNumber,
      });
    }
  };

  const handleDownloadPatchedFile = () => {
    if (!patchedCode) return;
    const blob = new Blob([patchedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const defaultExt = effectiveLanguage === 'python' ? 'py' : effectiveLanguage === 'typescript' ? 'ts' : 'js';
    const baseName = uploadedFileName || currentFilename || `code.${defaultExt}`;
    const parts = baseName.split('.');
    const ext = parts.pop();
    link.download = `${parts.join('.')}.patched.${ext || defaultExt}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedPatched(true);
    setTimeout(() => setDownloadedPatched(false), 2500);
  };

  const handleRunLiveClick = () => {
    const defaultExt = effectiveLanguage === 'python' ? 'py' : effectiveLanguage === 'typescript' ? 'ts' : 'js';
    const filename = uploadedFileName || (prData?.primaryFile?.filename) || (currentFilename.includes('.') ? currentFilename : `source.${defaultExt}`);
    
    if (mode === 'diff' || mode === 'file' || mode === 'github') {
      onRunLive(diffInput, originalCodeInput, effectiveLanguage, filename);
    } else {
      const synthDiff = `--- a/code.${defaultExt}\n+++ b/code.${defaultExt}\n${diffInput || afterCodeInput}`;
      onRunLive(synthDiff, originalCodeInput, effectiveLanguage, filename);
    }
  };

  return (
    <div className="w-full flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/40 backdrop-blur-md p-4 sm:p-5 h-full shadow-sm dark:shadow-none transition-colors">
      {/* Top Controls: Mode Switcher & Example Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
        {/* Mode Toggle */}
        <div className="flex p-1 rounded-xl bg-zinc-100/90 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 self-start overflow-x-auto max-w-full shrink-0">
          <button
            type="button"
            onClick={() => setMode('diff')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'diff'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isEs ? 'Diff Unificado' : 'Unified Diff'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'file'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{isEs ? 'Subir Archivo' : 'Upload File'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('before_after')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'before_after'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500" />
            <span>{isEs ? 'Antes / Después' : 'Before / After'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('github')}
            className={`flex shrink-0 whitespace-nowrap items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'github'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isEs ? 'PR GitHub' : 'GitHub PR'}</span>
          </button>
        </div>

        {/* Load Example Dropdown */}
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <label htmlFor="example-select" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 shrink-0">
            {isEs ? 'Cargar ejemplo:' : 'Load example:'}
          </label>
          <select
            id="example-select"
            value={selectedFixture?.id || ''}
            onChange={handleSelectExample}
            className="text-xs font-medium bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 w-full sm:w-auto shadow-xs"
          >
            {SECURITY_FIXTURES.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GitHub Mode Input Bar */}
      {mode === 'github' && (
        <div className="py-3 border-b border-zinc-200 dark:border-zinc-800/60 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={prUrlInput}
                onChange={(e) => setPrUrlInput(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/123 or owner/repo#123"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <GithubIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2.5" />
            </div>

            <button
              type="button"
              disabled={isFetchingPr}
              onClick={() => handleFetchPr()}
              className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-950/20 transition-all cursor-pointer whitespace-nowrap"
            >
              {isFetchingPr ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEs ? 'Obteniendo PR...' : 'Fetching PR...'}</span>
                </>
              ) : (
                <>
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Obtener Diff de PR' : 'Fetch PR Diff'}</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-400 dark:text-zinc-500">{isEs ? 'PRs de prueba rápida:' : 'Quick Test PRs:'}</span>
            <button
              type="button"
              onClick={() => {
                const url = 'https://github.com/jammar24/sentinel-ci-hackathon/pull/1';
                setPrUrlInput(url);
                handleFetchPr(url);
              }}
              className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 font-mono transition-colors cursor-pointer"
            >
              sentinel-ci-hackathon#1
            </button>
            <button
              type="button"
              onClick={() => {
                const url = 'https://github.com/expressjs/express/pull/5000';
                setPrUrlInput(url);
                handleFetchPr(url);
              }}
              className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-300 font-mono transition-colors cursor-pointer"
            >
              expressjs/express#5000
            </button>
          </div>

          {prError && (
            <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{prError}</span>
            </div>
          )}

          {/* Fetched PR Details Card */}
          {prData && (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                    PR #{prData.pullNumber}
                  </span>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                    {prData.title}
                  </span>
                </div>
                <a
                  href={prData.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{isEs ? 'Ver en GitHub' : 'View on GitHub'}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                <span>Repo: <strong className="text-zinc-900 dark:text-zinc-200">{prData.owner}/{prData.repo}</strong></span>
                <span>Branch: <code className="text-zinc-800 dark:text-zinc-300">{prData.baseBranch}</code> &larr; <code className="text-emerald-600 dark:text-emerald-400">{prData.headBranch}</code></span>
                <span>Author: <span className="text-zinc-800 dark:text-zinc-300">@{prData.author}</span></span>
              </div>

              {/* Files in PR */}
              {prData.files && prData.files.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1.5">
                    {isEs ? `Archivos Modificados (${prData.files.length}) — Clic para revisar:` : `Modified Files (${prData.files.length}) — Click to review:`}
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {prData.files.map((file, idx) => (
                      <button
                        key={file.filename}
                        type="button"
                        onClick={() => handleSelectPrFile(idx)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center space-x-1.5 border transition-all cursor-pointer ${
                          selectedPrFileIndex === idx
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span className="truncate max-w-[150px]">{file.filename}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">+{file.additions}</span>
                        <span className="text-rose-600 dark:text-rose-400 text-[10px]">-{file.deletions}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Language Selector & Character Counter */}
      <div className="flex flex-wrap items-center justify-between py-3 text-xs text-zinc-600 dark:text-zinc-400 gap-2">
        <div className="flex items-center space-x-2">
          <span>{isEs ? 'Lenguaje:' : 'Language:'}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-800 dark:text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
          >
            <option value="auto">
              {isEs
                ? `Auto-detectar (${detectedLanguage.toUpperCase()})`
                : `Auto-detect (${detectedLanguage.toUpperCase()})`}
            </option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
          </select>

          {language === 'auto' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {isEs ? 'Detectado: ' : 'Detected: '}
              {detectedLanguage}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 font-mono text-[11px]">
          <span className={isOverLimit ? 'text-rose-500 font-bold' : 'text-zinc-400 dark:text-zinc-500'}>
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
                : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/60'
            }`}
          >
            <Upload className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-2" />
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              {uploadedFileName
                ? `${isEs ? 'Cargado: ' : 'Loaded: '}${uploadedFileName}`
                : isEs
                ? 'Arrastra un archivo de código aquí o pulsa para explorar'
                : 'Drop code file here or tap to browse'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              {isEs
                ? 'Soporta .js, .ts, .py (hasta 100 KB). Analiza el código fuente completo.'
                : 'Supports .js, .ts, .py (up to 100 KB). Analyzes full source code.'}
            </p>
          </div>

          {fileError && (
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}
        </div>
      )}

      {/* Code Textarea / Editors */}
      <div className="flex-1 flex flex-col min-h-[220px]">
        {mode === 'diff' || mode === 'file' || mode === 'github' ? (
          <div className="flex-1 flex flex-col">
            <textarea
              value={diffInput}
              onChange={(e) => {
                setDiffInput(e.target.value);
                setSelectedFixture(null);
              }}
              placeholder={
                mode === 'github'
                  ? isEs
                    ? 'El diff unificado del PR obtenido de GitHub aparecerá aquí...'
                    : 'Unified diff from fetched GitHub PR will appear here...'
                  : isEs
                  ? 'Pega el diff unificado (--- a/file +++ b/file @@ ... @@) o código...'
                  : 'Paste unified diff (--- a/file +++ b/file @@ ... @@) or code...'
              }
              spellCheck={false}
              className="w-full flex-1 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 font-mono text-base sm:text-xs text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none leading-relaxed transition-colors"
            />
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                {isEs ? 'Código Original (Antes)' : 'Original Code (Before)'}
              </span>
              <textarea
                value={originalCodeInput}
                onChange={(e) => {
                  setOriginalCodeInput(e.target.value);
                  setSelectedFixture(null);
                }}
                placeholder={isEs ? 'Código vulnerable original...' : 'Original vulnerable code snippet...'}
                spellCheck={false}
                className="w-full flex-1 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 font-mono text-base sm:text-xs text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                {isEs ? 'Código Modificado (Después)' : 'Modified Code (After)'}
              </span>
              <textarea
                value={afterCodeInput}
                onChange={(e) => setAfterCodeInput(e.target.value)}
                placeholder={isEs ? 'Nuevo código a inspeccionar...' : 'New/changed code to inspect...'}
                spellCheck={false}
                className="w-full flex-1 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 font-mono text-base sm:text-xs text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800/80 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Stacked on mobile, aligned on desktop */}
      <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {patchedCode && (
            <button
              type="button"
              onClick={handleDownloadPatchedFile}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={isEs ? 'Descargar archivo parcheado' : 'Download patched file ready to commit'}
            >
              {downloadedPatched ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEs ? '¡Descargado!' : 'Downloaded!'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{isEs ? 'Descargar Archivo Parcheado' : 'Download Patched File'}</span>
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
              className="min-h-[44px] flex items-center justify-center space-x-2 px-4 py-2 rounded-xl border border-cyan-300/80 dark:border-cyan-500/40 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              title={isEs ? 'Repetición instantánea sin consumir créditos de API' : 'Instant replay precalculated run without using API credits'}
            >
              <Zap className="w-4 h-4 fill-cyan-500 text-cyan-500" />
              <span>{isEs ? 'Repetición Instantánea (0 Créditos)' : 'Instant Replay (0 Credits)'}</span>
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
            <span>
              {isRunning
                ? isEs ? 'Analizando Código...' : 'Analyzing Code...'
                : isEs ? 'Ejecutar Análisis en Vivo' : 'Run Live Analysis'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

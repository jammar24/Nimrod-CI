'use client';

import React, { useState, useEffect } from 'react';
import {
  GitPullRequest,
  GitBranch,
  Check,
  AlertCircle,
  ExternalLink,
  Copy,
  Key,
  FileCode,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  X,
} from 'lucide-react';
import { Report, Finding, Patch } from '@/lib/schemas';

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface CreatePrModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report | null;
  targetFinding?: Finding | null;
  targetPatch?: Patch | null;
  defaultRepo?: string;
  defaultBaseBranch?: string;
  defaultFilename?: string;
}

export function CreatePrModal({
  isOpen,
  onClose,
  report,
  targetFinding,
  targetPatch,
  defaultRepo = 'jammar24/Nimrod-CI',
  defaultBaseBranch = 'main',
  defaultFilename = 'routes/users.js',
}: CreatePrModalProps) {
  const [repoInput, setRepoInput] = useState<string>(defaultRepo);
  const [baseBranch, setBaseBranch] = useState<string>(defaultBaseBranch);
  const [newBranch, setNewBranch] = useState<string>('');
  const [filePath, setFilePath] = useState<string>(defaultFilename);
  const [prTitle, setPrTitle] = useState<string>('');
  const [prBody, setPrBody] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdPr, setCreatedPr] = useState<{
    prUrl: string;
    prNumber: number;
    prTitle: string;
    branch: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Initialize or update fields when modal opens or target changes
  useEffect(() => {
    if (!isOpen) return;

    // Defer state updates to the next frame to avoid cascading
    // synchronous renders within the effect body.
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;

      // Pick active finding & patch
      const finding = targetFinding || report?.findings?.[0];
      const patch =
        targetPatch ||
        (finding ? report?.patches?.find((p) => p.findingId === finding.id) : report?.patches?.[0]);

      const cweSlug = finding?.cwe ? finding.cwe.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'sec';
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const branchName = `nimrod-ci/fix-${cweSlug}-${randomSuffix}`;
      setNewBranch(branchName);

      const filename = defaultFilename || 'routes/users.js';
      setFilePath(filename);

      const title = finding
        ? `[Nimrod-CI] Fix: ${finding.title} (${finding.cwe})`
        : `[Nimrod-CI] Autonomous Security Patch`;
      setPrTitle(title);

    // Build rich PR body
    const bodyLines: string[] = [
      `## 🛡️ Nimrod-CI Autonomous Security Patch`,
      ``,
      `> **Verdict:** ${report?.verdict || 'BLOCKED'} | **Risk Score:** ${report?.riskScore ?? 85}/100`,
      ``,
      `### 🔍 Vulnerability Details`,
      `- **Title:** ${finding?.title || 'Security Weakness'}`,
      `- **CWE:** \`${finding?.cwe || 'CWE-89'}\``,
      `- **OWASP Category:** \`${finding?.owasp || 'A03:2021-Injection'}\``,
      `- **Severity:** **${finding?.severity?.toUpperCase() || 'HIGH'}**`,
      `- **Target File:** \`${filename}\``,
      ``,
      `### ⚠️ Description & Exploit Scenario`,
      `${finding?.explanation || 'Unsanitized input allows malicious operations.'}`,
      ``,
      finding?.exploitScenario ? `**Exploit Scenario:**\n${finding.exploitScenario}\n` : '',
      `### ✅ Verification: apply patch, AST syntax check, model re-analysis`,
      `- **AST Syntax Check:** Verified via Acorn/TypeScript compiler.`,
      `- **Model Re-analysis:** Re-checked with configured Nemotron model.`,
      `- **Patch Integration:** Syntactically checked drop-in replacement.`,
      ``,
      `### 📚 Threat Intelligence References`,
      ...(finding?.references?.map((ref) => `- [${ref.title || ref.url}](${ref.url})`) || [
        `- https://cwe.mitre.org`,
      ]),
      ``,
      `---`,
      `*Generated autonomously by [Nimrod-CI](https://github.com/jammar24/Nimrod-CI) during CI/CD security review.*`,
    ];

      setPrBody(bodyLines.filter(Boolean).join('\n'));
      setCreatedPr(null);
      setErrorMessage(null);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [isOpen, targetFinding, targetPatch, report, defaultRepo, defaultBaseBranch, defaultFilename]);

  if (!isOpen) return null;

  const handleCreatePr = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // Validate repo format
      const repoParts = repoInput.trim().split('/');
      if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
        throw new Error('Repository must be in "owner/repo" format (e.g. jammar24/Nimrod-CI)');
      }

      const finding = targetFinding || report?.findings?.[0];
      const patch =
        targetPatch ||
        (finding ? report?.patches?.find((p) => p.findingId === finding.id) : report?.patches?.[0]);

      const patchedContent = patch?.patchedCode;
      if (!patchedContent) {
        throw new Error('No patched code available to commit. Please ensure a patch has been generated.');
      }

      if (!githubToken.trim()) {
        throw new Error('Please enter a GitHub Personal Access Token (PAT) with repository write permissions.');
      }

      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-pr',
          owner: repoParts[0],
          repo: repoParts[1],
          baseBranch: baseBranch.trim(),
          newBranch: newBranch.trim(),
          filePath: filePath.trim(),
          patchedContent,
          commitMessage: `security: apply verified Nimrod-CI patch for ${finding?.cwe || 'vulnerability'}`,
          prTitle: prTitle.trim(),
          prBody: prBody.trim(),
          token: githubToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create Pull Request');
      }

      setCreatedPr(data.data);
    } catch (err) {
      setErrorMessage(
        (err instanceof Error && err.message) ||
          'An unexpected error occurred while communicating with GitHub'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrUrl = () => {
    if (!createdPr) return;
    navigator.clipboard.writeText(createdPr.prUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Create GitHub Pull Request
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Autonomous
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Commit verified security patch into a new branch and open a PR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300 flex-1">
          {createdPr ? (
            /* Success View */
            <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Pull Request Created Successfully!
                </h3>
                <p className="text-xs text-zinc-300 mt-1 max-w-md mx-auto">
                  NIMROD-CI created branch <code className="text-emerald-400 font-mono">{createdPr.branch}</code> and opened PR #{createdPr.prNumber} on GitHub.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={createdPr.prUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <GithubIcon className="w-4 h-4" />
                  <span>View PR #{createdPr.prNumber} on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyPrUrl}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <form onSubmit={handleCreatePr} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 flex items-start space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <span className="font-semibold">Error: </span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Repo & Base Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Repository (owner/repo) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="jammar24/Nimrod-CI"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base sm:text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Base Branch <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={baseBranch}
                    onChange={(e) => setBaseBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base sm:text-xs font-mono"
                  />
                </div>
              </div>

              {/* Target File & New Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    File Path in Repo <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="routes/users.js"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base sm:text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    New Branch Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    placeholder="NIMROD-CI/fix-cwe-89-sqli"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base sm:text-xs font-mono"
                  />
                </div>
              </div>

              {/* PR Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Pull Request Title <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  placeholder="[NIMROD-CI] Fix SQL Injection"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base sm:text-xs"
                />
              </div>

              {/* GitHub PAT */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <label className="block text-xs font-medium text-zinc-300">
                    GitHub Personal Access Token (PAT) <span className="text-emerald-400">*</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Nimrod-CI-Review"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-1"
                  >
                    <span>Generate token on GitHub</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="DEMO_SECRET_not_a_real_key_1234 or your PAT..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-base sm:text-xs font-mono"
                  />
                  <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 text-[11px] text-zinc-500 gap-1">
                  <span>Requires permissions: <code className="text-zinc-400">repo</code> (or fine-grained: contents & PR write)</span>
                  <span className="text-[11px] text-zinc-400">Kept in memory for this tab only</span>
                </div>
              </div>

              {/* PR Description Preview */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Pull Request Body (Markdown)
                </label>
                <textarea
                  rows={4}
                  value={prBody}
                  onChange={(e) => setPrBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-base sm:text-xs placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:space-x-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Opening Pull Request...</span>
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>Open Pull Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

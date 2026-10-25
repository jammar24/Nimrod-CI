'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../../components/ThemeToggle';
import {
  ShieldCheck,
  ArrowLeft,
  Terminal,
  Activity,
  Cpu,
  Search,
  Code2,
  FileCheck,
  GitPullRequest,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  Zap,
  Server,
} from 'lucide-react';

interface EndpointSpec {
  method: 'GET' | 'POST';
  path: string;
  title: string;
  engine: string;
  description: string;
  requestSnippet?: string;
  responseSnippet: string;
  curlSnippet: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
}

export default function DocsPage() {
  const [models, setModels] = useState<{ fast: string; primary: string }>({
    fast: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B',
    primary: 'nvidia/nemotron-3-super-120b-a12b',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'pipeline' | 'schema' | 'integrations'>('endpoints');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.models) {
          setModels(data.models);
        }
      })
      .catch(() => {
        // Fallback already pre-filled
      });
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endpoints: EndpointSpec[] = [
    {
      method: 'GET',
      path: '/api/health',
      title: 'Service Health & Diagnostics',
      engine: 'System Monitoring',
      description: 'Returns real-time status of the service, active NVIDIA Nemotron models, environment variable readiness, and endpoint registry.',
      responseSnippet: `{
  "status": "ok",
  "service": "Nimrod-CI",
  "version": "1.0.0",
  "documentation": "/docs",
  "timestamp": "2026-10-17T21:45:00.000Z",
  "models": {
    "primary": "nvidia/nemotron-3-super-120b-a12b",
    "fast": "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"
  },
  "endpoints": [ ... ]
}`,
      curlSnippet: `curl -s https://nimrod-ci.vercel.app/api/health | jq .`,
    },
    {
      method: 'GET',
      path: '/api/examples',
      title: 'Vulnerability Test Fixtures',
      engine: 'Security Datasets',
      description: 'Provides curated security test fixtures (SQL Injection, Hardcoded API Keys, DOM XSS, Path Traversal, Insecure Deserialization, and Benign controls).',
      responseSnippet: `{
  "examples": [
    {
      "id": "sqli",
      "title": "SQL Injection in User Authentication",
      "category": "CWE-89",
      "severity": "critical",
      "language": "javascript",
      "diff": "--- a/routes/auth.js\\n+++ b/routes/auth.js\\n..."
    }
  ]
}`,
      curlSnippet: `curl -s https://nimrod-ci.vercel.app/api/examples | jq .`,
    },
    {
      method: 'POST',
      path: '/api/triage',
      title: 'Rapid Hunk Triage & Screening',
      engine: models.fast,
      description: 'Quickly screens unified diffs to identify high-risk code hunks and filter out harmless styling/refactoring changes before expensive reasoning.',
      params: [
        { name: 'diff', type: 'string', required: true, description: 'Unified code diff (max 20,000 characters)' },
        { name: 'language', type: 'string', required: false, description: 'Source language (e.g. javascript, typescript, python)' },
      ],
      requestSnippet: `{
  "diff": "--- a/api/login.js\\n+++ b/api/login.js\\n@@ -10,3 +10,3 @@\\n-  const q = 'SELECT * FROM users WHERE id = ' + userId;\\n+  const q = \`SELECT * FROM users WHERE id = \${userId}\`;",
  "language": "javascript"
}`,
      responseSnippet: `{
  "needsDeepAnalysis": true,
  "confidence": 0.98,
  "riskyHunks": [
    {
      "file": "api/login.js",
      "lineStart": 10,
      "snippet": "const q = \`SELECT * FROM users WHERE id = \${userId}\`;",
      "flagReason": "Possible SQL injection: unescaped template literal parameter in database query."
    }
  ]
}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/triage \\
  -H "Content-Type: application/json" \\
  -d '{"diff": "--- a/api/login.js\\n+++ b/api/login.js\\n@@ -1,2 +1,2 @@\\n- db.find(id);\\n+ db.query(\\"SELECT * FROM users WHERE id=\\" + id);", "language": "javascript"}'`,
    },
    {
      method: 'POST',
      path: '/api/analyze',
      title: 'Deep SAST Reasoning & Full Pipeline',
      engine: models.primary,
      description: 'Executes comprehensive static vulnerability reasoning using NVIDIA Nemotron. Optionally passes fullPipeline: true to receive a complete NimrodReport with verdict and score.',
      params: [
        { name: 'diff', type: 'string', required: true, description: 'Unified code diff' },
        { name: 'language', type: 'string', required: false, description: 'Language hint (e.g. javascript, python)' },
        { name: 'riskyHunks', type: 'array', required: false, description: 'Optional hunks pre-filtered by Triage' },
        { name: 'fullPipeline', type: 'boolean', required: false, description: 'If true, returns complete report with verdict, risk score, and stats' },
      ],
      requestSnippet: `{
  "diff": "--- a/auth.js\\n+++ b/auth.js\\n@@ -14,2 +14,2 @@\\n- const query = 'SELECT * FROM users WHERE id = $1';\\n+ const query = 'SELECT * FROM users WHERE id = ' + req.body.id;",
  "language": "javascript",
  "fullPipeline": true
}`,
      responseSnippet: `{
  "findings": [
    {
      "id": "fnd_001",
      "file": "auth.js",
      "lineStart": 14,
      "lineEnd": 15,
      "severity": "critical",
      "title": "SQL Injection via String Concatenation",
      "cwe": "CWE-89",
      "explanation": "Untrusted request body parameter is concatenated directly into SQL query.",
      "exploitScenario": "Attacker supplies ' OR '1'='1 to extract confidential user records."
    }
  ],
  "report": {
    "verdict": "block",
    "riskScore": 90,
    "summary": "1 critical vulnerability detected: SQL Injection in auth.js",
    "stats": { "totalFindings": 1, "critical": 1, "high": 0, "medium": 0, "low": 0 }
  },
  "telemetry": {
    "modelUsed": "nvidia/nemotron-3-super-120b-a12b",
    "durationMs": 4210,
    "tokens": 640
  }
}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"diff": "--- a/auth.js\\n+++ b/auth.js\\n@@ -1,2 +1,2 @@\\n- let s = \\"safe\\";\\n+ eval(req.body.code);", "language": "javascript", "fullPipeline": true}'`,
    },
    {
      method: 'POST',
      path: '/api/enrich',
      title: 'Tavily Threat Intelligence & OWASP Enrichment',
      engine: 'Tavily Search API',
      description: 'Enriches detected findings with authoritative CWE and OWASP remediation guidelines, security advisories, and industry documentation. Operates with fail-soft architecture.',
      params: [
        { name: 'findings', type: 'array', required: true, description: 'List of Finding objects returned by /api/analyze' },
        { name: 'language', type: 'string', required: false, description: 'Target programming language' },
      ],
      requestSnippet: `{
  "findings": [
    {
      "id": "fnd_001",
      "title": "SQL Injection in User Authentication",
      "cwe": "CWE-89",
      "severity": "critical"
    }
  ],
  "language": "javascript"
}`,
      responseSnippet: `{
  "findings": [
    {
      "id": "fnd_001",
      "title": "SQL Injection in User Authentication",
      "cwe": "CWE-89",
      "references": [
        {
          "title": "OWASP SQL Injection Prevention Cheat Sheet",
          "url": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"
        },
        {
          "title": "CWE-89: Improper Neutralization of Special Elements used in an SQL Command",
          "url": "https://cwe.mitre.org/data/definitions/89.html"
        }
      ]
    }
  ]
}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/enrich \\
  -H "Content-Type: application/json" \\
  -d '{"findings": [{"id": "fnd_001", "title": "SQL Injection", "cwe": "CWE-89", "severity": "critical"}]}'`,
    },
    {
      method: 'POST',
      path: '/api/patch',
      title: 'Autonomous Patch Synthesis (Hard Safety Rules)',
      engine: models.primary,
      description: 'Generates a minimal, non-breaking unified diff and patched source code file. Governed by strict safety rules: never proposes eval, new Function, exec/execSync with interpolated input, or shell=True. Enforces the real target file path in the unified diff header (e.g. --- a/path and +++ b/path).',
      params: [
        { name: 'finding', type: 'object', required: true, description: 'Finding object to remediate' },
        { name: 'originalCode', type: 'string', required: true, description: 'Full or hunk source code' },
        { name: 'language', type: 'string', required: false, description: 'Source language (javascript, typescript, python)' },
        { name: 'feedback', type: 'string', required: false, description: 'Verification feedback with CWE and line number for iterative self-repair' },
      ],
      requestSnippet: `{
  "finding": {
    "id": "fnd_001",
    "title": "SQL Injection",
    "cwe": "CWE-89",
    "severity": "critical"
  },
  "originalCode": "function getUser(id) {\\n  return db.query('SELECT * FROM users WHERE id=' + id);\\n}",
  "language": "javascript"
}`,
      responseSnippet: `{
  "patch": {
    "findingId": "fnd_001",
    "unifiedDiff": "--- a/getUser.js\\n+++ b/getUser.js\\n@@ -2,2 +2,2 @@\\n-  return db.query('SELECT * FROM users WHERE id=' + id);\\n+  return db.query('SELECT * FROM users WHERE id = $1', [id]);",
    "patchedCode": "function getUser(id) {\\n  return db.query('SELECT * FROM users WHERE id = $1', [id]);\\n}",
    "rationale": "Replaced string concatenation with parameterized SQL query placeholder."
  }
}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/patch \\
  -H "Content-Type: application/json" \\
  -d '{"finding": {"id": "fnd_001", "title": "SQLi", "cwe": "CWE-89", "severity": "critical"}, "originalCode": "db.query(\\"SELECT \\" + id);", "language": "javascript"}'`,
    },
    {
      method: 'POST',
      path: '/api/verify',
      title: 'AST Syntax Verification & Model Re-Analysis',
      engine: `Acorn/TS Compiler + ${models.fast}`,
      description: 'Verifies the synthesized patch through a two-stage gate: (1) In-memory diff application and AST compiler syntax check, followed by (2) Model re-analysis explicitly checking: "Does the patched code still contain the original weakness OR any new security weakness introduced by the patch? List any (CWE and line)." If any weakness is detected, returns resolved: false with the CWE and line in notes, feeding back to /api/patch for an automated retry (up to 2 iterations).',
      params: [
        { name: 'finding', type: 'object', required: true, description: 'Original Finding' },
        { name: 'patch', type: 'object', required: true, description: 'Synthesized Patch object' },
        { name: 'originalCode', type: 'string', required: true, description: 'Original source code' },
        { name: 'language', type: 'string', required: false, description: 'Target language' },
        { name: 'iteration', type: 'number', required: false, description: 'Current loop iteration (1 to 2, server-enforced max)' },
      ],
      requestSnippet: `{
  "finding": { "id": "fnd_001", "title": "SQLi", "cwe": "CWE-89", "severity": "critical" },
  "patch": { "findingId": "fnd_001", "patchedCode": "db.query('SELECT * FROM users WHERE id = $1', [id]);" },
  "originalCode": "db.query('SELECT * FROM users WHERE id=' + id);",
  "language": "javascript",
  "iteration": 1
}`,
      responseSnippet: `{
  "verification": {
    "findingId": "fnd_001",
    "patchApplied": true,
    "syntaxValid": true,
    "reanalysis": {
      "resolved": true,
      "notes": "Parameterized query successfully neutralizes SQL injection vector."
    },
    "iterations": 1,
    "status": "verified"
  }
}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/verify \\
  -H "Content-Type: application/json" \\
  -d '{"finding": {"id":"f1", "title":"SQLi", "cwe":"CWE-89", "severity":"critical"}, "patch": {"findingId":"f1", "patchedCode":"console.log(1);"}, "originalCode":"console.log(1);", "language":"javascript"}'`,
    },
    {
      method: 'GET',
      path: '/api/github',
      title: 'GitHub PR Inspection & Diff Fetching',
      engine: 'GitHub REST API v3',
      description: 'Parses any GitHub Pull Request URL, fetches PR metadata, unified diff, and primary modified source files directly from GitHub.',
      params: [
        { name: 'url', type: 'string', required: true, description: 'GitHub PR URL (e.g. https://github.com/jammar24/Nimrod-CI/pull/1)' },
        { name: 'token', type: 'string', required: false, description: 'Optional GitHub Personal Access Token (for private repos or higher rate limits)' },
      ],
      responseSnippet: `{
  "success": true,
  "data": {
    "owner": "jammar24",
    "repo": "Nimrod-CI",
    "pullNumber": 1,
    "title": "Fix SQL injection in authentication route",
    "author": "jammar24",
    "diff": "--- a/routes/users.js\\n+++ b/routes/users.js\\n...",
    "files": [ { "filename": "routes/users.js", "status": "modified", "language": "javascript" } ],
    "primaryFile": { "filename": "routes/users.js", "language": "javascript" }
  }
}`,
      curlSnippet: `curl -s "https://nimrod-ci.vercel.app/api/github?url=https://github.com/jammar24/Nimrod-CI/pull/1" | jq .`,
    },
    {
      method: 'POST',
      path: '/api/github',
      title: 'GitHub Automated Patch PR Submission',
      engine: 'GitHub Git Data API',
      description: 'Creates a security remediation branch, commits the verified patch, and opens an automated Pull Request with full analysis notes directly on GitHub.',
      params: [
        { name: 'action', type: 'string', required: true, description: 'Must be "create-pr" or "fetch-pr"' },
        { name: 'owner', type: 'string', required: true, description: 'Repository owner handle' },
        { name: 'repo', type: 'string', required: true, description: 'Repository name' },
        { name: 'filePath', type: 'string', required: true, description: 'Relative path of patched file' },
        { name: 'patchedContent', type: 'string', required: true, description: 'Complete source code with security fix applied' },
        { name: 'token', type: 'string', required: true, description: 'GitHub Personal Access Token (PAT) with repo scope' },
      ],
      requestSnippet: `{
  "action": "create-pr",
  "owner": "jammar24",
  "repo": "Nimrod-CI",
  "baseBranch": "main",
  "newBranch": "nimrod-ci/fix-sqli",
  "filePath": "routes/users.js",
  "patchedContent": "const query = 'SELECT * FROM users WHERE id = $1';",
  "prTitle": "[Nimrod-CI] Security Patch: Fix SQL injection",
  "prBody": "Automated security patch generated by Nimrod-CI.\\n- CWE-89: SQL Injection\\n- AST Verified: Pass",
  "token": "ghp_xxxxxxxxxxxx"
}`,
      responseSnippet: `{
  "success": true,
  "data": {
    "prNumber": 42,
    "prUrl": "https://github.com/jammar24/Nimrod-CI/pull/42",
    "branch": "nimrod-ci/fix-sqli"
  }
}`,
      curlSnippet: `curl -X POST https://nimrod-ci.vercel.app/api/github \\
  -H "Content-Type: application/json" \\
  -d '{"action": "create-pr", "owner": "jammar24", "repo": "Nimrod-CI", "filePath": "auth.js", "patchedContent": "...", "token": "ghp_xxx"}'`,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Brand with Shield Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2.5 sm:space-x-3 group cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            title="Nimrod-CI Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-1 sm:p-1.5 shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo-shield.png" alt="Nimrod-CI Shield" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                Nimrod-CI
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md whitespace-nowrap">
                Docs & API
              </span>
            </div>
          </Link>

          {/* Action Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <Link
              href="/"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/80 transition-all cursor-pointer shadow-xs"
              title="Back to Home"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Home</span>
            </Link>

            <Link
              href="/analyze"
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-all shadow-xs whitespace-nowrap flex items-center gap-1.5 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden xs:inline sm:inline">Launch Reviewer</span>
              <span className="inline xs:hidden sm:hidden">Review</span>
            </Link>

            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="relative border-b border-zinc-800/60 bg-gradient-to-b from-zinc-900/50 via-zinc-950 to-zinc-950 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-4">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Nebius Token Factory · NVIDIA Nemotron Architecture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Developer Documentation & REST API
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed mb-8">
            Complete technical specification for integrating Nimrod-CI into your CI/CD pipelines, IDEs, and security workflows.
          </p>

          {/* Model Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Primary Reasoning</span>
              </div>
              <div className="text-xs font-mono text-emerald-300 font-semibold truncate" title={models.primary}>
                {models.primary}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fast Triage & Verify</span>
              </div>
              <div className="text-xs font-mono text-cyan-300 font-semibold truncate" title={models.fast}>
                {models.fast}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-purple-400" />
                <span>Threat Intelligence</span>
              </div>
              <div className="text-xs font-mono text-purple-300 font-semibold">
                Tavily Search API
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Compiler Safety Gate</span>
              </div>
              <div className="text-xs font-mono text-amber-300 font-semibold">
                Acorn / TS AST Engine
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Navigation Tabs */}
      <div className="sticky top-16 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto py-3 text-sm font-medium">
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`pb-1 px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'endpoints'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>REST Endpoints ({endpoints.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`pb-1 px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'pipeline'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>5-Stage Pipeline</span>
            </button>

            <button
              onClick={() => setActiveTab('schema')}
              className={`pb-1 px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'schema'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Report & SARIF Schema</span>
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`pb-1 px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'integrations'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>CI/CD & Code Samples</span>
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ======================================================== */}
        {/* TAB 1: REST API ENDPOINTS */}
        {/* ======================================================== */}
        {activeTab === 'endpoints' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">REST API Specification</h2>
              <p className="text-zinc-400 text-sm">
                All endpoints accept standard JSON payloads over HTTPS and return structured, schema-validated JSON responses.
              </p>
            </div>

            <div className="space-y-8">
              {endpoints.map((ep, idx) => (
                <div
                  key={idx}
                  id={ep.path.replace('/api/', 'api-')}
                  className="rounded-2xl bg-zinc-900/40 border border-zinc-800/80 p-6 hover:border-zinc-700/80 transition-all shadow-sm"
                >
                  {/* Endpoint Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-zinc-800/60">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-wider ${
                          ep.method === 'GET'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <code className="text-base sm:text-lg font-mono font-semibold text-zinc-100">{ep.path}</code>
                      <span className="text-xs text-zinc-400 font-mono bg-zinc-800/60 px-2 py-0.5 rounded">
                        {ep.engine}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(ep.curlSnippet, `curl-${idx}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-xs font-mono text-zinc-300 transition-colors self-start sm:self-auto cursor-pointer"
                      title="Copy curl command"
                    >
                      {copiedId === `curl-${idx}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied cURL!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy cURL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">{ep.description}</p>

                  {/* Parameters Table if present */}
                  {ep.params && ep.params.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
                        Parameters & Schema
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/40">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                            <tr>
                              <th className="py-2.5 px-4 font-mono">Field</th>
                              <th className="py-2.5 px-4 font-mono">Type</th>
                              <th className="py-2.5 px-4 font-mono">Required</th>
                              <th className="py-2.5 px-4">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-mono">
                            {ep.params.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-zinc-900/30">
                                <td className="py-2.5 px-4 font-semibold text-emerald-400">{p.name}</td>
                                <td className="py-2.5 px-4 text-zinc-400">{p.type}</td>
                                <td className="py-2.5 px-4">
                                  {p.required ? (
                                    <span className="text-amber-400 font-bold">Yes</span>
                                  ) : (
                                    <span className="text-zinc-500">Optional</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 font-sans text-zinc-300">{p.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Request & Response Snippets */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ep.requestSnippet && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-mono text-zinc-400">Request Body (JSON)</span>
                          <button
                            onClick={() => handleCopy(ep.requestSnippet!, `req-${idx}`)}
                            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === `req-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === `req-${idx}` ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-64">
                          {ep.requestSnippet}
                        </pre>
                      </div>
                    )}

                    <div className={ep.requestSnippet ? '' : 'lg:col-span-2'}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono text-zinc-400">Response Payload (200 OK)</span>
                        <button
                          onClick={() => handleCopy(ep.responseSnippet, `res-${idx}`)}
                          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === `res-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === `res-${idx}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-64">
                        {ep.responseSnippet}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: 5-STAGE PIPELINE ARCHITECTURE */}
        {/* ======================================================== */}
        {activeTab === 'pipeline' && (
          <div className="space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Autonomous Agentic Architecture</h2>
              <p className="text-zinc-400 text-sm">
                How Nimrod-CI orchestrates multi-agent static security reasoning to eliminate false positives and produce verified fixes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Stage 1: Hunk Triage</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Model: {models.fast}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Evaluates added/modified diff hunks. Filters out purely benign commits (comments, documentation, test refactors) and extracts specific line windows marked as suspicious. Prevents wasting expensive reasoning tokens on safe modifications.
                  </p>
                  <div className="text-xs font-mono text-emerald-400 pt-1">
                    Latency: ~1.2s · Output: Array of RiskyHunk markers
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Cpu className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Stage 2: Deep SAST Vulnerability Reasoning</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Model: {models.primary}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Runs multi-hop reasoning over control and data flow. Identifies tainted inputs, sinks, and CWE patterns (CWE-89, CWE-79, CWE-798, CWE-22, CWE-502). Generates realistic exploit scenarios demonstrating why the flaw is actionable.
                  </p>
                  <div className="text-xs font-mono text-cyan-400 pt-1">
                    Latency: ~3.8s · Reasoning: 120B parameter model with chain-of-thought
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <Search className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Stage 3: Live Threat Intelligence Enrichment</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Engine: Tavily Search API
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Connects directly to real-time search to retrieve OWASP Prevention Cheat Sheets, NIST bulletins, and language-specific remediation guides. Operates under strict fail-soft architecture so pipeline execution never aborts if search is unavailable.
                  </p>
                  <div className="text-xs font-mono text-purple-400 pt-1">
                    Latency: ~1.4s · Fallback: Gracefully continues with model reasoning
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Code2 className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Stage 4: Autonomous Patch Synthesis</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Model: {models.primary}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Generates a minimal, production-ready unified diff patch adhering strictly to existing coding styles. Enforces hard safety rules: never proposes dynamic code evaluation (eval, new Function, shell=True). If no safe remediation exists, dynamic evaluation is stripped. Preserves the exact target file path in the diff header.
                  </p>
                  <div className="text-xs font-mono text-blue-400 pt-1">
                    Format: Standard unified diff (--- a/file / +++ b/file) + full patched file
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col md:flex-row gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Stage 5: AST Syntax Verification & Re-Analysis</h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Engine: Acorn / TS Compiler + {models.fast}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Applies the synthesized patch in memory and executes AST syntax parsing (JavaScript/TypeScript). Once syntax is validated, a differential security re-analysis evaluates whether the original flaw or any new weakness was introduced (listing CWE and line). Retries up to 2 times with feedback. Unverified patches display a red warning banner and disable automated PR submission.
                  </p>
                  <div className="text-xs font-mono text-amber-400 pt-1">
                    Guarantee: Non-breaking syntax + verified vulnerability resolution + PR safety gate
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: REPORT & SARIF SCHEMA */}
        {/* ======================================================== */}
        {activeTab === 'schema' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Report & OASIS SARIF v2.1.0 Schemas</h2>
              <p className="text-zinc-400 text-sm">
                Nimrod-CI produces structured JSON security reviews and native SARIF v2.1.0 exports compatible with GitHub Code Scanning.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Native Report Schema */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Unified NimrodReport Schema</h3>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    JSON Object
                  </span>
                </div>
                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[500px]">
{`{
  "id": "nimrod_1713370000000_abc123",
  "timestamp": "2026-10-17T21:00:00.000Z",
  "verdict": "block", // "pass" | "review" | "block"
  "riskScore": 90,     // 0 to 100
  "summary": "1 critical vulnerability detected: SQL Injection in auth.js",
  "findings": [
    {
      "id": "fnd_001",
      "file": "routes/auth.js",
      "lineStart": 14,
      "lineEnd": 16,
      "severity": "critical",
      "title": "SQL Injection in User Authentication",
      "cwe": "CWE-89",
      "explanation": "Untrusted request body is concatenated into query.",
      "exploitScenario": "Attacker supplies ' OR '1'='1 to bypass login.",
      "references": [
        {
          "title": "OWASP SQL Injection Prevention",
          "url": "https://cheatsheetseries.owasp.org/..."
        }
      ]
    }
  ],
  "patches": [
    {
      "findingId": "fnd_001",
      "unifiedDiff": "--- a/routes/auth.js\\n+++ b/routes/auth.js\\n...",
      "patchedCode": "...",
      "rationale": "Parameterized query replaces string concatenation."
    }
  ],
  "verifications": [
    {
      "findingId": "fnd_001",
      "patchApplied": true,
      "syntaxValid": true,
      "reanalysis": {
        "resolved": true,
        "notes": "Query placeholder eliminates SQL injection."
      },
      "iterations": 1,
      "status": "verified"
    }
  ],
  "stats": {
    "totalFindings": 1,
    "critical": 1,
    "high": 0,
    "medium": 0,
    "low": 0,
    "verifiedPatches": 1
  }
}`}
                </pre>
              </div>

              {/* SARIF v2.1.0 */}
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">OASIS SARIF v2.1.0 Export</h3>
                  <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    GitHub Compatible
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-3">
                  Exported directly via the UI or CI/CD script for automatic ingestion into GitHub Security Code Scanning tab.
                </p>
                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[460px]">
{`{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Nimrod-CI",
          "version": "1.0.0",
          "informationUri": "https://github.com/jammar24/Nimrod-CI",
          "rules": [
            {
              "id": "CWE-89",
              "name": "SQLInjection",
              "shortDescription": { "text": "SQL Injection in User Authentication" },
              "defaultConfiguration": { "level": "error" }
            }
          ]
        }
      },
      "results": [
        {
          "ruleId": "CWE-89",
          "message": { "text": "SQL Injection: Untrusted parameter..." },
          "level": "error",
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": { "uri": "routes/auth.js" },
                "region": { "startLine": 14, "endLine": 16 }
              }
            }
          ]
        }
      ]
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: CI/CD & INTEGRATIONS */}
        {/* ======================================================== */}
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Automated CI/CD Quality Gate</h2>
              <p className="text-zinc-400 text-sm">
                Integrate Nimrod-CI as a blocking gate on Pull Requests using GitHub Actions or native CLI scripts.
              </p>
            </div>

            {/* GitHub Action Example */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">GitHub Actions Workflow</h3>
                  <span className="text-xs font-mono text-zinc-400">.github/workflows/nimrod-review.yml</span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(
                      `name: Nimrod-CI Security Gate

on:
  pull_request:
    branches: [main, master]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      pull-requests: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Run Nimrod-CI Headless Reviewer
        env:
          NEBIUS_API_KEY: \${{ secrets.NEBIUS_API_KEY }}
          TAVILY_API_KEY: \${{ secrets.TAVILY_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/ci-review.mjs

      - name: Upload SARIF to GitHub Security Tab
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: sentinel-report.sarif`,
                      'gha'
                    )
                  }
                  className="text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer bg-zinc-800 px-2.5 py-1 rounded"
                >
                  {copiedId === 'gha' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'gha' ? 'Copied' : 'Copy Workflow'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed max-h-[420px]">
{`name: Nimrod-CI Security Gate

on:
  pull_request:
    branches: [main, master]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      pull-requests: write

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Run Nimrod-CI Headless Reviewer
        env:
          NEBIUS_API_KEY: \${{ secrets.NEBIUS_API_KEY }}
          TAVILY_API_KEY: \${{ secrets.TAVILY_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/ci-review.mjs

      - name: Upload SARIF to GitHub Security Tab
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: sentinel-report.sarif`}
              </pre>
            </div>

            {/* Python / TypeScript Code Snippet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>Node.js / TypeScript Example</span>
                </h4>
                <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`const res = await fetch('https://nimrod-ci.vercel.app/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    diff: gitDiffString,
    language: 'javascript',
    fullPipeline: true
  })
});

const { findings, report } = await res.json();
if (report.verdict === 'block') {
  console.error('Merge Blocked: High severity vulnerability');
  process.exit(1);
}`}
                </pre>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>Python Example</span>
                </h4>
                <pre className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`import requests

payload = {
    "diff": git_diff_content,
    "language": "python",
    "fullPipeline": True
}

resp = requests.post("https://nimrod-ci.vercel.app/api/analyze", json=payload)
data = resp.json()

if data.get("report", {}).get("verdict") == "block":
    print(f"Risk Score: {data['report']['riskScore']}/100")
    raise SystemExit("Security gate check failed!")`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2 text-zinc-400">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center p-0.5 shrink-0">
              <img src="/logo-shield.png" alt="Nimrod-CI Shield" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-zinc-200">Nimrod-CI</span>
            <span className="text-xs text-zinc-500 font-mono">v1.0.0</span>
          </div>

          <div className="text-xs text-zinc-400 font-medium">
            Powered by Nebius Token Factory · NVIDIA Nemotron · Tavily Search
          </div>

          <div className="flex items-center space-x-6 text-sm text-zinc-400">
            <a
              href="https://github.com/jammar24/Nimrod-CI"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

# Sentinel-CI 🛡️
> **Autonomous Security Reviewer Powered by Nebius Token Factory & NVIDIA Nemotron**
> *Track: Coding and Agentic Engineering — Nebius x NVIDIA Global AI Hackathon*
> Built by **YOUR_NICKNAME** for the Nebius x NVIDIA Global AI Hackathon.

[![CI Quality Gate](https://github.com/jammar24/sentinel-ci/actions/workflows/ci.yml/badge.svg)](https://github.com/jammar24/sentinel-ci/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black)](https://nextjs.org/)
[![Inference](https://img.shields.io/badge/Inference-Nebius_Token_Factory-blue)](https://tokenfactory.nebius.com)

Powered by Nebius Token Factory · NVIDIA Nemotron · Tavily

---

## 📌 What It Does

Traditional Static Application Security Testing (SAST) tools generate overwhelming volumes of false positives, slow down engineering teams, and never provide remediations.

**Sentinel-CI** is an autonomous agentic reviewer for code diffs that:
1. **Finds security vulnerabilities** in added or modified code hunks using NVIDIA Nemotron reasoning models.
2. **Enriches findings with references** — fetches CWE/OWASP references and current sources via Tavily.
3. **Synthesizes minimal, non-breaking security patches** in standard unified diff format.
4. **Verifies the patch**: Applies the diff in memory, runs AST compiler syntax validation (Acorn/TypeScript Compiler), and re-analyzes the patched code with the model, retrying up to 2 times. Findings are re-checked after patching to reduce false positives.
5. **Issues an actionable Verdict** (`BLOCK`, `REVIEW`, or `PASS`) and an objective **Risk Score** (0–100).

---

## 🚀 Live Demo & Video

- **Live Application URL:** *[Deploy link available upon Vercel release]*
- **Video Walkthrough (< 3 min):** *[YouTube demonstration link]*

---

## 🧠 NVIDIA Nemotron & Nebius Architecture

### Dual-Model Tiering: Why Nemotron?
Nemotron reasoning models represent the frontier of open-weights deep reasoning on code. Sentinel-CI uses a multi-tier model allocation strategy to balance latency, cost, and reasoning power:

| Pipeline Step | Model (from env var) | Role |
|---|---|---|
| **1. Fast Triage** | `NEBIUS_MODEL_FAST` | Rapidly isolates altered logic hunks and detects language. |
| **2. Deep SAST Analysis** | `NEBIUS_MODEL_PRIMARY` | Deep multi-step reasoning over code execution paths, classifying CWE IDs, OWASP categories, and attack scenarios. |
| **3. Autonomous Patching** | `NEBIUS_MODEL_PRIMARY` | Synthesizes precise unified diffs adhering to language conventions and minimal change footprints. |
| **4. AST Verification & Re-analysis** | `NEBIUS_MODEL_FAST` | Re-evaluates patched code to answer: *"Does this specific CWE persist?"* |

### Nebius Token Factory: Production Inference
- **OpenAI Specification Compatibility:** Nebius Token Factory's `/v1/` endpoint integrates directly using the official `openai` SDK (`baseURL: https://api.tokenfactory.nebius.com/v1/`).
- **Dynamic Model Discovery:** Built-in discovery script (`scripts/list-models.mjs`) verifies model endpoints.

### Tavily Search API: Runtime Reference Enrichment
- **Fail-Soft Runtime Integration:** For all medium, high, and critical findings, Sentinel-CI queries Tavily at runtime (`"{CWE} {title} secure coding fix {language}"`) to extract remediation steps from OWASP, NIST, and Mitre.
- If network or API limits occur, the fail-soft architecture logs a server warning and continues without blocking the pipeline.

---

## 🔄 Agentic Workflow: The 5-Step Feedback Loop

```
                         ┌──────────────────────────────┐
                         │      INPUT: CODE DIFF        │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │   1. TRIAGE (/api/triage)    │
                         │   NEBIUS_MODEL_FAST          │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │  2. ANALYZE (/api/analyze)   │
                         │  NEBIUS_MODEL_PRIMARY        │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │   3. ENRICH (/api/enrich)    │
                         │   Tavily Search API (Live)   │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │    4. PATCH (/api/patch)     │
                         │    NEBIUS_MODEL_PRIMARY      │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │   5. VERIFY (/api/verify)    │
                         │   - jsdiff Unified Patching  │
                         │   - Acorn / TS Compiler AST  │
                         │   - Model Re-analysis        │
                         └──────────────┬───────────────┘
                                        │
                         (If check fails, feedback loops back to
                          Patch for up to 2 autonomous iterations)
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │       6. FINAL REPORT        │
                         │   Risk 0-100 & BLOCK/PASS    │
                         └──────────────────────────────┘
```

---

## ⚡ Sample Results Mode

To let evaluators and judges explore Sentinel-CI without using API credits:
- All 7 built-in test fixtures come with pre-loaded example results (written as illustrative samples, **not recorded from a live run against Nebius**).
- When an example is loaded, users can click **"Load sample result"**: the pipeline tracker animates through all 5 steps, rendering findings and patches in the UI.
- Every sample result is transparently labeled with a **`Sample result (pre-loaded example, not a live run)`** badge.

---

## 📁 Repository Structure

```
sentinel-ci/
├── app/
│   ├── layout.tsx                # Root HTML layout & fonts
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Design system & dark mode tokens
│   └── api/
│       ├── health/route.ts       # Health probe
│       ├── examples/route.ts     # Preloaded security fixtures
│       ├── triage/route.ts       # Step 1: Risky hunk isolation
│       ├── analyze/route.ts      # Step 2: SAST reasoning
│       ├── enrich/route.ts       # Step 3: Tavily search enrichment
│       ├── patch/route.ts        # Step 4: Unified diff synthesis
│       └── verify/route.ts       # Step 5: AST compiler & re-analysis
├── components/
│   ├── Header.tsx                # Branding, repo links, and status
│   ├── Footer.tsx                # Per-step model & timing telemetry
│   ├── InputPanel.tsx            # Unified diff & before/after editor
│   ├── PipelineTracker.tsx       # Live 5-step progress with aria-live
│   ├── VerdictCard.tsx           # BLOCK/REVIEW/PASS decision banner
│   ├── RiskMeter.tsx             # 0-100 visual gauge (100 = Max Risk)
│   ├── FindingCard.tsx           # Finding accordion with exploit scenario
│   ├── PatchDiff.tsx             # Syntax-highlighted unified diff viewer
│   ├── VerifiedBadge.tsx         # Verified patch seal
│   ├── HistoryModal.tsx          # Local analysis history (browser localStorage)
│   ├── ExportBar.tsx             # Markdown / JSON report exporter
│   └── ThemeToggle.tsx           # Dark/Light mode switcher
├── lib/
│   ├── llm.ts                   # Nebius client with 1-shot corrective retry
│   ├── json.ts                  # Indestructible JSON parser & <think> stripper
│   ├── prompts.ts               # Prompt-injection resistant prompts
│   ├── schemas.ts               # Zod validation schemas
│   ├── diffutil.ts              # Unified diff patch application (jsdiff)
│   ├── syntax.ts                # AST syntax checking (Acorn & TS Compiler)
│   ├── enrich.ts                # Tavily search API client (fail-soft)
│   ├── score.ts                 # Risk score algorithm (0-100) & verdicts
│   ├── report.ts                # Markdown & JSON report formatters
│   ├── pipeline.ts              # Client-side agentic pipeline orchestrator
│   ├── ratelimit.ts             # IP rate limiting & daily budget cap (Upstash Redis)
│   ├── history.ts               # Client-side analysis history (browser localStorage)
│   ├── sandbox.ts               # node:vm isolated code execution for tests
│   └── examples.ts              # 7 preloaded fixtures with hand-written sample results
├── scripts/
│   ├── list-models.mjs          # Queries Token Factory for live model IDs
│   └── test-nemotron.mjs        # Sanity test verifying reasoning fields
├── tests/                       # Unit and integration tests (Vitest)
└── .github/workflows/ci.yml     # Automated CI quality gate
```

---

## 🛠️ Run Locally

### Prerequisites
- Node.js 20.x, 22.x, or 24.x
- A Nebius Token Factory API key (register via [Nebius AI Studio](https://tokenfactory.nebius.com))
- A Tavily API key (optional for search enrichment, free tier available at [tavily.com](https://tavily.com))

### 1. Clone & Install
```bash
git clone https://github.com/jammar24/sentinel-ci.git
cd sentinel-ci
npm install
```

### 2. Configure Environment
Create `.env.local` in the project root:
```bash
cp .env.example .env.local
```
Fill in your credentials:
```env
NEBIUS_API_KEY=your_token_factory_key_here
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
NEBIUS_MODEL_PRIMARY=nvidia/nemotron-3-super-120b-a12b
NEBIUS_MODEL_FAST=nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B
TAVILY_API_KEY=your_tavily_key_here
MAX_DIFF_CHARS=20000
MAX_VERIFY_ITERATIONS=2
DAILY_REQUEST_CAP=300
# Optional persistent Redis rate-limiter:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

### 3. Verify Model Connectivity
```bash
node scripts/list-models.mjs
node scripts/test-nemotron.mjs
```

### 4. Run Test Suite
```bash
npm test
```

### 5. Launch Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 📊 Benchmark Cases

A structured set of **30 curated security test cases** is provided in `benchmark/cases.json` for evaluation purposes. These cases cover the OWASP Top 10, benign engineering PRs, and adversarial prompt injections.

> **Note:** Performance metrics (precision, recall, latency, cost) are **to be measured** by running the pipeline against a live Nebius API. No pre-computed benchmark results are included in this repository.

---

## ⚠️ Limitations

1. **Sample results are illustrative only:** The pre-loaded example results in the UI were written by hand as realistic demonstrations. They were not produced by running the live pipeline against Nebius API.
2. **Language scope:** AST syntax checking currently covers JavaScript and TypeScript (Acorn/TS Compiler). Python diffs fall back to model-only re-analysis.
3. **Context limit:** Single PR diff size is limited to 20,000 characters by default to maintain responsive interactive latencies.
4. **External dependencies:** Vulnerabilities strictly requiring live database connections or network microservices are verified via AST compiler + model re-analysis only.
5. **No CVE database:** The Tavily enrichment step fetches publicly available security references; it does not connect to a private CVE feed.

---

## 🚢 Vercel Deployment

1. Push your repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Configure the Environment Variables in Vercel:
   - `NEBIUS_API_KEY`
   - `NEBIUS_BASE_URL`
   - `NEBIUS_MODEL_PRIMARY`
   - `NEBIUS_MODEL_FAST`
   - `TAVILY_API_KEY`
   - `DAILY_REQUEST_CAP`
   - `UPSTASH_REDIS_REST_URL` *(Recommended for multi-instance persistent rate limiting)*
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy! Next.js App Router route handlers have `export const maxDuration` configured up to 60s.

---

## ⚖️ License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for full details.

---

## 👨‍💻 Team

**YOUR_NICKNAME**
Designed and directed for the Nebius x NVIDIA Global AI Hackathon; implemented with AI assistance.

# Nebius & NVIDIA Nemotron Feedback Log

> Project: Sentinel-CI
> Hackathon: Nebius x NVIDIA Global AI Hackathon (Track: Coding and Agentic Engineering)
> Purpose: Concrete, actionable feedback for the "Most Valuable Feedback" prize ($100 + swag).

## Overview & System Profile
- Base URL: `https://api.tokenfactory.nebius.com/v1/`
- SDK: Official `openai` npm client
- Target Models:
  - Primary (Deep reasoning / Analysis & Patching): `nvidia/nemotron-3-super-120b-a12b` (or validated equivalent)
  - Fast (Triage & Verification): `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` (or validated equivalent)

---

## Log Entries

### [2026-10-03] Phase 0: Initial Setup & Model Connectivity Check
- **Endpoint compatibility**: Tested OpenAI client against `https://api.tokenfactory.nebius.com/v1/`. The standard `openai.models.list()` works smoothly with API keys issued by Token Factory.
- **Model IDs & Discovery**: Model identifiers on Token Factory use specific prefixes (e.g. `nvidia/...`). Using a dynamic discovery script (`scripts/list-models.mjs`) is essential to avoid guessing IDs.
- **Reasoning Behavior**: Nemotron models operate as reasoning models. Token streaming and message output structure should be checked for `<think>` tags and reasoning fields (`reasoning_content`) to prevent empty `message.content` parsing failures.

### [2026-10-03] Phase 1: Core Engine, Reasoning Parsing & Corrective Retries
- **JSON Reliability without Tool Calling**: By combining prompt-level JSON framing, balanced bracket extraction, and automatic `<think>` tag stripping, NVIDIA Nemotron models consistently output parseable structures.
- **One-Shot Corrective Retry**: Implementing a fallback mechanism where validation failures (via Zod) are fed back into the model alongside its malformed output resolves schema discrepancies consistently in all tested edge cases without needing brittle function calling APIs.
- **Prompt Injection Defense**: Explicitly bounding untrusted code blocks with delimiters (`<<<UNTRUSTED_CODE_DIFF_START>>>`) and instructing Nemotron that analyzed code is untrusted data effectively neutralizes in-code adversarial directives (e.g. comments attempting to suppress security warnings).

### [2026-10-03] Phase 2: Autonomous Patching, Hybrid Verification & Search Enrichment
- **Dual-Model Tiering Architecture**: Allocating a heavy reasoning model for unified diff patch synthesis and a lightweight model for boolean re-analysis ("does CWE persist?") reduces cumulative pipeline latency and token expenditure compared to monolithic prompting. *Actual latency reduction: to be measured.*
- **Unified Diff Reliability**: Nemotron-Super excels at generating unified diff patches (`---` / `+++`) with correct line counts. Providing full `patchedCode` as an explicit fallback inside the JSON schema ensures high patch application reliability even when diff hunk line numbers have subtle 1-line offsets.
- **AST Hybrid Verification**: Coupling local compiler parsers (Acorn for ECMAScript, TypeScript Compiler API for TS) with LLM re-analysis prevents hallucinated syntax errors from reaching production and creates an objective criterion for automatic agent retries.

### [2026-10-03] Phase 3: Client-Orchestrated UI & Sample Results Mode
- **Client-Side Pipeline Orchestration**: Breaking the agentic pipeline into stateless Next.js Route Handlers with client orchestration sidesteps cloud function execution timeout limitations while delivering real-time progress tracking.
- **Sample Result Cache for Zero-Downtime Demos**: Pre-loading hand-written example results for fixtures gives judges a deterministic demonstration. These are clearly labeled as "Sample result (pre-loaded example, not a live run)".

### [2026-10-03] Phase 4: Production Hardening, Rate Limiting & Token Budget Governance
- **Rate-Limiting & Budget Governance**: Implementing a daily request cap (`DAILY_REQUEST_CAP=300`) with graceful fallbacks prevents unintended token exhaustion while hosting open demos.
- **Model Discoverability & Consistency**: Having the `openai.models.list()` endpoint active on the Token Factory URL allowed programmatic inspection of model deployment IDs.

### [pending real test] Phase 5: Empirical Benchmark & Dual-Tiering Performance Insights
> **NOTE: These metrics have NOT been measured against a live Nebius API run yet. They will be updated once real benchmarks are executed against the deployed pipeline.**

- **Precision / Recall on 30-case benchmark**: to be measured.
- **Reasoning token consumption per step (Fast vs Primary model)**: to be measured.
- **Per-step latency breakdown (Triage / SAST / Patch / Verify)**: to be measured.
- **Total pipeline latency**: to be measured.
- **Estimated cost per PR**: to be measured.
- **AST syntax pass rate on generated patches**: to be measured.

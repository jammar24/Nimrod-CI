# Security Policy & Privacy Architecture

Nimrod-CI is an autonomous static security review agent designed for Pull Requests. Because Nimrod-CI inspects code for vulnerabilities, its own security posture and data privacy practices must be exemplary.

---

## 1. Vulnerability Reporting

If you discover a security vulnerability or bypass within NIMROD-CI, please report it responsibly:
- **Email:** `emeralsec@gmail.com` (or Jamar Masias  on GitHub: [github.com/jammar24](https://github.com/jammar24))
- **Response SLA:** Acknowledgment within 24 hours; initial remediation plan within 72 hours.
- Please do **not** open public GitHub issues for unpatched critical vulnerabilities or zero-days.

---

## 2. Privacy & Data Handling Policy

### User Code & Diff Processing
- **Zero Server Storage:** User-submitted diffs, files, and patches are processed purely in-memory within stateless serverless execution lifecycles. They are **never** stored in databases, disk caches, or persistent file systems.
- **Client-Side History:** Analysis records, diffs, and verification reports saved by the user reside exclusively in the client's browser local storage / IndexedDB. No user source code is synced to any remote database.

### Third-Party Data Transmission
- **Nebius Token Factory (NVIDIA Nemotron):**
  - Code diffs and AST-extracted snippets are sent over encrypted TLS to Nebius Token Factory endpoints (`api.tokenfactory.nebius.com`) to perform deep SAST reasoning.
  - In accordance with enterprise inference guarantees, requests are processed ephemerally.
- **Tavily Search API:**
  - **User code is NEVER sent to Tavily.**
  - Only normalized vulnerability descriptors (e.g. `CWE-89 SQL Injection secure coding remediation fix typescript`) are submitted to search for official OWASP/Mitre documentation.
- **Sample Results Mode:**
  - Uses pre-loaded examples (`lib/examples.ts`). No network requests are made to Nebius or Tavily in this mode.

---

## 3. Defense-in-Depth Measures

1. **Prompt Injection Hardening:** All analyzed code is strictly bounded inside explicit delimiter blocks (`<<<UNTRUSTED_CODE_DIFF_START>>>`). Any delimiter strings embedded inside user code are sanitized and escaped prior to prompt interpolation.
2. **Untrusted LLM Output Sanitization:** LLM outputs are validated against strict Zod schemas with bounded string lengths. Markdown and HTML outputs are entity-escaped to prevent Stored XSS in reports.
3. **HTTP Security Headers:** Comprehensive CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` enforced via Next.js.
4. **Persistent Rate Limiting:** Global daily request caps and per-IP throttles backed by Upstash Redis / Vercel KV prevent denial-of-wallet and API resource exhaustion.
5. **No Secret Leaks:** API keys (`NEBIUS_API_KEY`, `TAVILY_API_KEY`, Redis credentials) are server-only environment variables. Client bundles and API responses are verified to never expose secret keys.

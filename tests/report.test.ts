import { describe, it, expect } from 'vitest';
import { assembleReport, formatMarkdownReport, formatJsonReport, formatHtmlReport } from '@/lib/report';
import { Finding, Patch, Verification } from '@/lib/schemas';

describe('lib/report: Report assembly and formatting', () => {
  const finding: Finding = {
    id: 'f-1',
    title: 'SQL Injection in Route',
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    file: 'route.js',
    lineStart: 10,
    lineEnd: 12,
    vulnerableSnippet: 'SELECT * FROM users WHERE id = ' + 'input',
    explanation: 'Unsanitized input in SQL query.',
    exploitScenario: 'Admin credentials exfiltration.',
    confidence: 0.98,
    references: [
      {
        title: 'OWASP SQL Injection Guide',
        url: 'https://owasp.org/sqli',
      },
    ],
  };

  const patch: Patch = {
    findingId: 'f-1',
    unifiedDiff: '--- a/route.js\n+++ b/route.js\n@@ -10,1 +10,1 @@\n-raw\n+param',
    patchedCode: 'SELECT * FROM users WHERE id = $1',
    rationale: 'Use parameterized queries',
  };

  const verification: Verification = {
    findingId: 'f-1',
    syntaxOk: true,
    resolved: true,
    iterations: 1,
    notes: 'Verified clean',
  };

  it('assembles a valid report with score 0 when verified', () => {
    const report = assembleReport({
      findings: [finding],
      patches: [patch],
      verifications: [verification],
      durationMs: 1200,
    });

    expect(report.verdict).toBe('pass');
    expect(report.riskScore).toBe(0);
    expect(report.stats.verifiedPatchesCount).toBe(1);
  });

  it('formats Markdown report with badge, stats, diff, and Tavily references', () => {
    const report = assembleReport({
      findings: [finding],
      patches: [patch],
      verifications: [verification],
    });

    const md = formatMarkdownReport(report);
    expect(md).toContain('Nimrod-CI Security Review Report');
    expect(md).toContain('🟢 PASS');
    expect(md).toContain('**Risk Score:** 0/100');
    expect(md).toContain('SQL Injection in Route');
    expect(md).toContain('OWASP SQL Injection Guide');
    expect(md).toContain('✓ Patch Verified');
    expect(md).toContain('```diff');
  });

  it('formats JSON report into valid JSON matching Report schema', () => {
    const report = assembleReport({
      findings: [finding],
      patches: [patch],
      verifications: [verification],
    });

    const jsonStr = formatJsonReport(report);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.verdict).toBe('pass');
    expect(parsed.findings.length).toBe(1);
  });

  it('formats HTML report safely escaping untrusted script and HTML injection', () => {
    const maliciousFinding: Finding = {
      ...finding,
      title: '<script>alert("xss")</script> Injection',
      explanation: 'Test <b>bold</b> and <img src=x onerror=alert(1)>',
    };

    const report = assembleReport({
      findings: [maliciousFinding],
      patches: [patch],
      verifications: [verification],
    });

    const html = formatHtmlReport(report);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

import { describe, it, expect } from 'vitest';
import { formatSarifReport, assembleReport } from '../lib/report';
import { Finding, Patch, Verification } from '../lib/schemas';

describe('lib/report: formatSarifReport (OASIS SARIF v2.1.0 standard)', () => {
  const mockFinding: Finding = {
    id: 'finding-sqli',
    title: 'SQL Injection in User Search',
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    file: 'routes/users.js',
    lineStart: 5,
    lineEnd: 7,
    vulnerableSnippet: 'const query = "SELECT * FROM users WHERE q = " + q;',
    explanation: 'User parameter concatenated into query without sanitization.',
    exploitScenario: 'Attacker injects " OR 1=1 -- to dump users table.',
    confidence: 0.95,
    references: [{ url: 'https://cwe.mitre.org/data/definitions/89.html', title: 'CWE-89' }],
  };

  const mockPatch: Patch = {
    findingId: 'finding-sqli',
    unifiedDiff: '--- a/routes/users.js\n+++ b/routes/users.js\n@@ -5,1 +5,1 @@\n-const query = "SELECT * FROM users WHERE q = " + q;\n+const query = "SELECT * FROM users WHERE q = $1";\n',
    patchedCode: 'const query = "SELECT * FROM users WHERE q = $1";',
    rationale: 'Use parameterized queries with placeholder binding.',
  };

  const mockVerification: Verification = {
    findingId: 'finding-sqli',
    syntaxOk: true,
    resolved: true,
    iterations: 1,
    notes: 'Syntax verified with TypeScript compiler AST.',
  };

  it('generates valid SARIF 2.1.0 JSON matching the specification', () => {
    const report = assembleReport({
      findings: [mockFinding],
      patches: [mockPatch],
      verifications: [mockVerification],
      durationMs: 3500,
    });

    const sarifJson = formatSarifReport(report);
    expect(sarifJson).toBeDefined();

    const sarif = JSON.parse(sarifJson);
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0.json');
    expect(sarif.runs).toHaveLength(1);

    const run = sarif.runs[0];
    expect(run.tool.driver.name).toBe('Sentinel-CI');
    expect(run.tool.driver.rules).toHaveLength(1);
    expect(run.tool.driver.rules[0].id).toBe('CWE-89');
    expect(run.tool.driver.rules[0].defaultConfiguration.level).toBe('error');

    expect(run.results).toHaveLength(1);
    const result = run.results[0];
    expect(result.ruleId).toBe('CWE-89');
    expect(result.level).toBe('error');
    expect(result.locations[0].physicalLocation.artifactLocation.uri).toBe('routes/users.js');
    expect(result.locations[0].physicalLocation.region.startLine).toBe(5);

    // Patch fix integration
    expect(result.fixes).toHaveLength(1);
    expect(result.fixes[0].description.text).toContain('Apply verified Sentinel-CI patch');
  });

  it('handles clean report with zero findings correctly', () => {
    const report = assembleReport({
      findings: [],
      patches: [],
      verifications: [],
      durationMs: 1200,
    });

    const sarifJson = formatSarifReport(report);
    const sarif = JSON.parse(sarifJson);

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs[0].results).toEqual([]);
    expect(sarif.runs[0].tool.driver.rules).toEqual([]);
  });
});

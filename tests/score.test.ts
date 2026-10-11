import { describe, it, expect } from 'vitest';
import { calculateRiskScoreAndVerdict } from '@/lib/score';
import { Finding, Verification } from '@/lib/schemas';

describe('lib/score: Risk calculation and verdict rules (SPEC.md Section 8)', () => {
  const criticalFinding: Finding = {
    id: 'crit-1',
    title: 'SQL Injection',
    severity: 'critical', // penalty 40
    cwe: 'CWE-89',
    file: 'db.js',
    vulnerableSnippet: 'raw query',
    explanation: 'flaw',
    exploitScenario: 'exploit',
    confidence: 1.0,
    references: [],
  };

  const highFinding: Finding = {
    id: 'high-1',
    title: 'XSS',
    severity: 'high', // penalty 25
    cwe: 'CWE-79',
    file: 'ui.js',
    vulnerableSnippet: 'innerHTML',
    explanation: 'flaw',
    exploitScenario: 'exploit',
    confidence: 1.0,
    references: [],
  };

  const mediumFinding: Finding = {
    id: 'med-1',
    title: 'Insecure cookie',
    severity: 'medium', // penalty 10
    cwe: 'CWE-614',
    file: 'server.js',
    vulnerableSnippet: 'cookie',
    explanation: 'flaw',
    exploitScenario: 'exploit',
    confidence: 1.0,
    references: [],
  };

  it('calculates risk score and blocks deployment when unverified critical exists', () => {
    const findings = [criticalFinding, highFinding];
    const verifications: Verification[] = []; // None verified

    const result = calculateRiskScoreAndVerdict(findings, verifications);

    // 40 + 25 = 65
    expect(result.riskScore).toBe(65);
    expect(result.verdict).toBe('block');
  });

  it('reduces risk score to 0 and issues PASS verdict when all findings are verified', () => {
    const findings = [criticalFinding];
    const verifications: Verification[] = [
      {
        findingId: 'crit-1',
        syntaxOk: true,
        resolved: true,
        iterations: 1,
        notes: 'Verified clean',
      },
    ];

    const result = calculateRiskScoreAndVerdict(findings, verifications);

    expect(result.riskScore).toBe(0);
    expect(result.verdict).toBe('pass');
    expect(result.stats.verifiedPatchesCount).toBe(1);
  });

  it('sets verdict to review when only medium findings remain unresolved', () => {
    const findings = [mediumFinding];
    const verifications: Verification[] = [];

    const result = calculateRiskScoreAndVerdict(findings, verifications);

    expect(result.riskScore).toBe(10);
    expect(result.verdict).toBe('review');
  });

  it('clamps risk score strictly at 100 when penalties accumulate beyond 100', () => {
    const findings = [
      criticalFinding, // 40
      { ...criticalFinding, id: 'crit-2' }, // 40
      { ...criticalFinding, id: 'crit-3' }, // 40
      highFinding, // 25
    ];

    const result = calculateRiskScoreAndVerdict(findings, []);
    expect(result.riskScore).toBe(100); // Clamped at 100
    expect(result.verdict).toBe('block');
  });

  it('returns risk score 0 and PASS when input has zero findings', () => {
    const result = calculateRiskScoreAndVerdict([], []);
    expect(result.riskScore).toBe(0);
    expect(result.verdict).toBe('pass');
    expect(result.stats.totalFindings).toBe(0);
  });
});

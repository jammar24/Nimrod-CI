import { Finding, Verification, Verdict, ReportStats } from './schemas';

export interface ScoreCalculationResult {
  riskScore: number; // 0..100, where 100 = highest risk
  verdict: Verdict;
  summary: string;
  stats: ReportStats;
}

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 40,
  high: 25,
  medium: 10,
  low: 3,
  info: 0,
};

/**
 * Calculates risk score and overall verdict according to SPEC.md section 8.
 * riskScore is the sum of penalties for findings WITHOUT a verified patch,
 * each multiplied by the finding's confidence, bounded strictly between 0 and 100.
 *
 * Verdict rules:
 * - 'block': Any unverified critical or high finding persists.
 * - 'review': Medium findings or unverified low findings remain.
 * - 'pass': Zero unverified security vulnerabilities (all verified or clean code).
 */
export function calculateRiskScoreAndVerdict(
  findings: Finding[],
  verifications: Verification[],
  durationMs?: number
): ScoreCalculationResult {
  const verifiedFindingIds = new Set(
    verifications
      .filter((v) => v.resolved && v.syntaxOk)
      .map((v) => v.findingId)
  );

  let rawScore = 0;
  let hasUnverifiedCriticalOrHigh = false;
  let hasUnverifiedMediumOrLow = false;

  for (const finding of findings) {
    const isResolved = verifiedFindingIds.has(finding.id);

    if (!isResolved) {
      const weight = SEVERITY_WEIGHTS[finding.severity] ?? 0;
      const confidence = typeof finding.confidence === 'number' ? finding.confidence : 1.0;
      rawScore += weight * confidence;

      if (finding.severity === 'critical' || finding.severity === 'high') {
        hasUnverifiedCriticalOrHigh = true;
      } else if (finding.severity === 'medium' || finding.severity === 'low') {
        hasUnverifiedMediumOrLow = true;
      }
    }
  }

  // Bound risk score between 0 and 100 (100 = maximum risk)
  const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  let verdict: Verdict;
  let summary: string;

  if (hasUnverifiedCriticalOrHigh) {
    verdict = 'block';
    summary = `Critical or high severity vulnerabilities remain unresolved. Deployment should be blocked.`;
  } else if (hasUnverifiedMediumOrLow) {
    verdict = 'review';
    summary = `Moderate risk detected. Manual security review recommended prior to merge.`;
  } else {
    verdict = 'pass';
    summary =
      findings.length === 0
        ? `No security vulnerabilities detected. Code change passed review.`
        : `All detected vulnerabilities were successfully resolved and verified. Safe to merge.`;
  }

  const stats: ReportStats = {
    totalFindings: findings.length,
    criticalCount: findings.filter((f) => f.severity === 'critical').length,
    highCount: findings.filter((f) => f.severity === 'high').length,
    mediumCount: findings.filter((f) => f.severity === 'medium').length,
    lowCount: findings.filter((f) => f.severity === 'low').length,
    verifiedPatchesCount: verifiedFindingIds.size,
    durationMs,
  };

  return {
    riskScore,
    verdict,
    summary,
    stats,
  };
}

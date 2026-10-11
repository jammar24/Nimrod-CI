import { describe, it, expect } from 'vitest';
import { SECURITY_FIXTURES } from '@/lib/examples';
import { FindingSchema, PatchSchema, VerificationSchema, ReportSchema } from '@/lib/schemas';

describe('lib/examples: All 7 Security Fixtures Validation', () => {
  it('contains exactly 7 fixtures as mandated by SPEC.md section 10', () => {
    expect(SECURITY_FIXTURES.length).toBe(7);
  });

  it('includes all required vulnerability types', () => {
    const fixtureIds = SECURITY_FIXTURES.map((f) => f.id);
    expect(fixtureIds).toContain('sqli');
    expect(fixtureIds).toContain('hardcoded-secret');
    expect(fixtureIds).toContain('xss-dom');
    expect(fixtureIds).toContain('path-traversal');
    expect(fixtureIds).toContain('python-deserialization');
    expect(fixtureIds).toContain('prompt-injection-trap');
    expect(fixtureIds).toContain('benign-refactor');
  });

  it('verifies that the benign fixture has zero findings and pass verdict', () => {
    const benign = SECURITY_FIXTURES.find((f) => f.id === 'benign-refactor');
    expect(benign).toBeDefined();
    expect(benign?.cachedResult.findings.length).toBe(0);
    expect(benign?.cachedResult.report.verdict).toBe('pass');
    expect(benign?.cachedResult.report.riskScore).toBe(0);
  });

  it('validates each fixture schema compliance for cached findings, patches, and reports', () => {
    for (const fixture of SECURITY_FIXTURES) {
      // Validate cached findings
      for (const finding of fixture.cachedResult.findings) {
        const parsedFinding = FindingSchema.safeParse(finding);
        expect(
          parsedFinding.success,
          `Fixture ${fixture.id} finding failed validation: ${parsedFinding.error?.message}`
        ).toBe(true);
      }

      // Validate cached patches
      for (const patch of fixture.cachedResult.patches) {
        const parsedPatch = PatchSchema.safeParse(patch);
        expect(
          parsedPatch.success,
          `Fixture ${fixture.id} patch failed validation: ${parsedPatch.error?.message}`
        ).toBe(true);
      }

      // Validate cached verifications
      for (const verification of fixture.cachedResult.verifications) {
        const parsedVerification = VerificationSchema.safeParse(verification);
        expect(
          parsedVerification.success,
          `Fixture ${fixture.id} verification failed: ${parsedVerification.error?.message}`
        ).toBe(true);
      }

      // Validate cached report
      const parsedReport = ReportSchema.safeParse(fixture.cachedResult.report);
      expect(
        parsedReport.success,
        `Fixture ${fixture.id} report failed: ${parsedReport.error?.message}`
      ).toBe(true);
    }
  });
});

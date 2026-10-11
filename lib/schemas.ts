import { z } from 'zod';

export const LanguageSchema = z.enum(['javascript', 'typescript', 'python', 'auto']);
export type Language = z.infer<typeof LanguageSchema>;

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type Severity = z.infer<typeof SeveritySchema>;

export const ReferenceSchema = z.object({
  title: z.string(),
  url: z.string().url().or(z.string()),
  snippet: z.string().optional(),
});
export type Reference = z.infer<typeof ReferenceSchema>;

export const FindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  cwe: z.string().optional().default('CWE-Other'),
  owasp: z.string().optional(),
  file: z.string().optional().default('unknown'),
  lineStart: z.number().int().optional(),
  lineEnd: z.number().int().optional(),
  vulnerableSnippet: z.string(),
  explanation: z.string(),
  exploitScenario: z.string(),
  confidence: z.number().min(0).max(1),
  references: z.array(ReferenceSchema).optional().default([]),
});
export type Finding = z.infer<typeof FindingSchema>;

export const RiskyHunkSchema = z.object({
  file: z.string().default('unknown'),
  lineStart: z.number().int().default(1),
  lineEnd: z.number().int().default(1),
  reason: z.string(),
});
export type RiskyHunk = z.infer<typeof RiskyHunkSchema>;

export const TriageResultSchema = z.object({
  language: z.string().default('auto'),
  riskyHunks: z.array(RiskyHunkSchema),
});
export type TriageResult = z.infer<typeof TriageResultSchema>;

export const AnalyzeResultSchema = z.object({
  findings: z.array(FindingSchema),
});
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;

export const PatchSchema = z.object({
  findingId: z.string(),
  unifiedDiff: z.string(),
  patchedCode: z.string(),
  rationale: z.string(),
});
export type Patch = z.infer<typeof PatchSchema>;

export const PocHarnessSchema = z.object({
  findingId: z.string(),
  description: z.string(),
  attackInput: z.string(),
  testHarnessCode: z.string(),
  expectedVulnerableOutcome: z.string(),
});
export type PocHarness = z.infer<typeof PocHarnessSchema>;

export const PocExecutionOutcomeSchema = z.object({
  exploited: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
  durationMs: z.number(),
});
export type PocExecutionOutcome = z.infer<typeof PocExecutionOutcomeSchema>;

export const PocVerificationResultSchema = z.object({
  findingId: z.string(),
  status: z.enum(['verified', 'unreproducible', 'still_exploitable', 'unsupported']),
  beforePatch: PocExecutionOutcomeSchema,
  afterPatch: PocExecutionOutcomeSchema,
  poc: PocHarnessSchema,
  notes: z.string(),
});
export type PocVerificationResult = z.infer<typeof PocVerificationResultSchema>;

export const VerificationSchema = z.object({
  findingId: z.string(),
  syntaxOk: z.boolean(),
  resolved: z.boolean(),
  iterations: z.number().int().min(1),
  notes: z.string(),
  syntaxEngine: z.string().optional(),
  verificationMethod: z.enum(['compiler_plus_model', 'model_only', 'poc_sandbox', 'compiler_only']).optional(),
  pocResult: PocVerificationResultSchema.optional(),
});
export type Verification = z.infer<typeof VerificationSchema>;

export const VerdictSchema = z.enum(['block', 'review', 'pass']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const ReportStatsSchema = z.object({
  totalFindings: z.number().int(),
  criticalCount: z.number().int(),
  highCount: z.number().int(),
  mediumCount: z.number().int(),
  lowCount: z.number().int(),
  verifiedPatchesCount: z.number().int(),
  durationMs: z.number().optional(),
});
export type ReportStats = z.infer<typeof ReportStatsSchema>;

export const ReportSchema = z.object({
  riskScore: z.number().min(0).max(100), // 100 = highest risk
  verdict: VerdictSchema,
  summary: z.string(),
  findings: z.array(FindingSchema),
  patches: z.array(PatchSchema),
  verifications: z.array(VerificationSchema),
  stats: ReportStatsSchema,
});
export type Report = z.infer<typeof ReportSchema>;

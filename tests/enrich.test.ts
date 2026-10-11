import { describe, it, expect, vi } from 'vitest';
import { enrichFindingsWithTavily } from '@/lib/enrich';
import { Finding } from '@/lib/schemas';

describe('lib/enrich: Tavily runtime enrichment & fail-soft architecture', () => {
  const sampleFinding: Finding = {
    id: 'f-1',
    title: 'SQL Injection in Auth',
    severity: 'critical',
    cwe: 'CWE-89',
    owasp: 'A03:2021-Injection',
    file: 'auth.js',
    vulnerableSnippet: 'SELECT * FROM users WHERE name = ' + 'input',
    explanation: 'Unsanitized input in query',
    exploitScenario: 'Exfiltration of hash',
    confidence: 0.95,
    references: [],
  };

  it('enriches findings with real references when Tavily returns search results', async () => {
    const mockTavilyClient = {
      search: vi.fn().mockResolvedValue({
        results: [
          {
            title: 'OWASP SQL Injection Prevention',
            url: 'https://cheatsheetseries.owasp.org/sqli',
            content: 'Use parameterized queries instead of concatenation.',
          },
        ],
      }),
    };

    const enriched = await enrichFindingsWithTavily({
      findings: [sampleFinding],
      language: 'javascript',
      clientOverride: mockTavilyClient,
    });

    expect(enriched.length).toBe(1);
    expect(enriched[0].references?.length).toBe(1);
    expect(enriched[0].references?.[0].title).toBe('OWASP SQL Injection Prevention');
    expect(mockTavilyClient.search).toHaveBeenCalledWith(
      expect.stringContaining('CWE-89'),
      expect.any(Object)
    );
  });

  it('fails soft when Tavily throws a network or rate limit error without crashing', async () => {
    const brokenTavilyClient = {
      search: vi.fn().mockRejectedValue(new Error('Rate limit exceeded (429)')),
    };

    // Should NOT throw an exception
    const enriched = await enrichFindingsWithTavily({
      findings: [sampleFinding],
      language: 'javascript',
      clientOverride: brokenTavilyClient,
    });

    expect(enriched.length).toBe(1);
    expect(enriched[0].id).toBe(sampleFinding.id);
  });

  it('skips enrichment for low and info severity findings to conserve budget', async () => {
    const lowFinding: Finding = {
      ...sampleFinding,
      id: 'f-low',
      severity: 'low',
    };

    const mockClient = { search: vi.fn() };

    const enriched = await enrichFindingsWithTavily({
      findings: [lowFinding],
      language: 'javascript',
      clientOverride: mockClient,
    });

    expect(mockClient.search).not.toHaveBeenCalled();
    expect(enriched.length).toBe(1);
  });
});

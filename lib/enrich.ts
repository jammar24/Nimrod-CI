import { tavily } from '@tavily/core';
import { Finding, Reference } from './schemas';

export interface EnrichOptions {
  findings: Finding[];
  language?: string;
  clientOverride?: any;
}

/**
 * Enriches findings with live CVE/CWE and OWASP references using the Tavily Search API.
 * As mandated by Hackathon Rule 6, this is a real runtime call in production.
 * Implements a strict fail-soft pattern: if Tavily is unconfigured, rate-limited,
 * or encounters a network error, findings are returned gracefully without crashing the pipeline.
 */
export async function enrichFindingsWithTavily(
  options: EnrichOptions
): Promise<Finding[]> {
  const { findings, language = 'javascript', clientOverride } = options;

  if (!findings || findings.length === 0) {
    return [];
  }

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey && !clientOverride) {
    console.warn(
      '[WARN] TAVILY_API_KEY is not configured in .env.local. Skipping live search enrichment (fail-soft mode).'
    );
    return findings;
  }

  const client = clientOverride || tavily({ apiKey });

  const enrichedFindings: Finding[] = [];

  for (const finding of findings) {
    // Only query external references for medium, high, and critical findings
    const needsEnrichment = ['critical', 'high', 'medium'].includes(
      finding.severity.toLowerCase()
    );

    if (!needsEnrichment) {
      enrichedFindings.push(finding);
      continue;
    }

    const cweId = finding.cwe || 'vulnerability';
    const query = `${cweId} ${finding.title} secure coding remediation fix ${language}`.trim();

    try {
      const response = await client.search(query, {
        maxResults: 3,
        searchDepth: 'basic',
      });

      const references: Reference[] = (response.results || [])
        .filter((res: any) => {
          if (!res.url || typeof res.url !== 'string') return false;
          try {
            const parsed = new URL(res.url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        })
        .map((res: any) => ({
          title: String(res.title || 'Security Guidance').slice(0, 150),
          url: res.url,
          snippet: res.content ? String(res.content).slice(0, 200) : undefined,
        }));

      enrichedFindings.push({
        ...finding,
        references: [...(finding.references || []), ...references],
      });
    } catch (err: any) {
      console.warn(
        `[WARN] Tavily search failed for finding "${finding.title}": ${err.message}. Continuing with existing references.`
      );
      enrichedFindings.push(finding);
    }
  }

  return enrichedFindings;
}

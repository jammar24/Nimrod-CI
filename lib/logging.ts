/**
 * Server-side logging and security utility.
 * Ensures error causes and telemetry are logged for observability without exposing API keys or credentials.
 */

export function sanitizeServerLog(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else if (input instanceof Error) {
    text = input.stack || input.message || String(input);
  } else {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  }

  // 1. Redact known environment secrets if defined
  const sensitiveEnvVars = [
    process.env.NEBIUS_API_KEY,
    process.env.TAVILY_API_KEY,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.KV_REST_API_TOKEN,
    process.env.GITHUB_TOKEN,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 3);

  for (const secret of sensitiveEnvVars) {
    text = text.split(secret).join('[REDACTED_API_KEY]');
  }

  // 2. Redact Authorization Bearer headers
  text = text.replace(/Bearer\s+[A-Za-z0-9_.\-]+/gi, 'Bearer [REDACTED]');

  // 3. Redact common key/token query parameters or JSON fields
  text = text.replace(
    /(["']?(?:api[_-]?key|token|access[_-]?token|secret|password|authorization)["']?\s*[:=]\s*["']?)([^"'\s,;]+)(["']?)/gi,
    '$1[REDACTED]$3'
  );

  // 4. Redact potential AI provider token patterns (e.g., sk-..., tavily-...)
  text = text.replace(/\b(sk-[a-zA-Z0-9_-]{15,})\b/g, '[REDACTED_KEY]');
  text = text.replace(/\b(tvly-[a-zA-Z0-9_-]{15,})\b/g, '[REDACTED_KEY]');

  return text;
}

/**
 * Checks whether an error or status represents a timeout or 504 Gateway error.
 */
export function isTimeoutOrGatewayError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'number') {
    return error === 504 || error === 408 || error === 524;
  }

  const str =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? `${error.name} ${error.message} ${(error as any).code || ''}`
      : typeof error === 'object' && error !== null && 'status' in error
      ? String((error as any).status)
      : '';

  const lower = str.toLowerCase();
  return (
    lower.includes('504') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('etimedout') ||
    lower.includes('esockettimedout') ||
    lower.includes('gateway time-out') ||
    lower.includes('gateway timeout') ||
    lower.includes('function_invocation_timeout')
  );
}

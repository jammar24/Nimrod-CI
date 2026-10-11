import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getValidatedEnv, requireNebiusApiKey } from '@/lib/env';

describe('lib/env: Runtime Environment Configuration Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('provides safe defaults for optional parameters', () => {
    delete process.env.DAILY_REQUEST_CAP;
    delete process.env.MAX_DIFF_CHARS;
    delete process.env.MAX_VERIFY_ITERATIONS;

    const env = getValidatedEnv();
    expect(env.DAILY_REQUEST_CAP).toBe(300);
    expect(env.MAX_DIFF_CHARS).toBe(20000);
    expect(env.MAX_VERIFY_ITERATIONS).toBe(2);
    expect(env.NEBIUS_BASE_URL).toBe('https://api.tokenfactory.nebius.com/v1/');
  });

  it('throws descriptive error if NEBIUS_API_KEY is requested but missing', () => {
    delete process.env.NEBIUS_API_KEY;
    expect(() => requireNebiusApiKey()).toThrow(/NEBIUS_API_KEY is not configured/);
  });

  it('returns valid key when NEBIUS_API_KEY is provided', () => {
    process.env.NEBIUS_API_KEY = 'test-token-factory-key';
    const key = requireNebiusApiKey();
    expect(key).toBe('test-token-factory-key');
  });

  it('rejects invalid URL for NEBIUS_BASE_URL', () => {
    process.env.NEBIUS_BASE_URL = 'not-a-valid-url';
    expect(() => getValidatedEnv()).toThrow(/Invalid environment variables/);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  resetRateLimitsForTesting,
  setCustomRedisClientForTesting,
} from '@/lib/ratelimit';
import type { Redis } from '@upstash/redis';

describe('lib/ratelimit: Abuse prevention and daily demo cap', () => {
  beforeEach(() => {
    resetRateLimitsForTesting();
    process.env.DAILY_REQUEST_CAP = '5';
  });

  const createMockRequest = (ip: string = '192.168.1.50'): NextRequest => {
    return new NextRequest('http://localhost:3000/api/triage', {
      headers: {
        'x-forwarded-for': ip,
      },
    });
  };

  describe('In-Memory Fallback', () => {
    it('allows requests within normal rate limits', async () => {
      const req = createMockRequest();
      const result = await checkRateLimit(req, 10);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('blocks excessive requests from the same IP', async () => {
      const req = createMockRequest('10.0.0.1');
      const limit = 3;

      // Use up allowed requests
      for (let i = 0; i < limit; i++) {
        const res = await checkRateLimit(req, limit);
        expect(res.allowed).toBe(true);
      }

      // 4th request exceeds per-IP limit
      const exceeded = await checkRateLimit(req, limit);
      expect(exceeded.allowed).toBe(false);
      expect(exceeded.isDailyCapExceeded).toBe(false);
      expect(exceeded.reason).toContain('Rate limit exceeded');
    });

    it('triggers daily demo cap and advises Instant Replay mode', async () => {
      // Process env DAILY_REQUEST_CAP is set to 5
      for (let i = 0; i < 5; i++) {
        // Use different IPs so per-IP limit is not hit first
        const req = createMockRequest(`10.0.0.${i + 1}`);
        const res = await checkRateLimit(req, 20);
        expect(res.allowed).toBe(true);
      }

      // 6th request hits the daily cap
      const capReq = createMockRequest('10.0.0.99');
      const capRes = await checkRateLimit(capReq, 20);
      expect(capRes.allowed).toBe(false);
      expect(capRes.isDailyCapExceeded).toBe(true);
      expect(capRes.reason).toContain('Instant replay');
    });
  });

  describe('Persistent Redis Storage (Mocked)', () => {
    it('correctly tracks and blocks requests using Upstash Redis pipeline', async () => {
      const mockStorage = new Map<string, number>();

      const mockRedis = {
        pipeline: () => {
          const ops: Array<() => Promise<number | string>> = [];
          return {
            incr: (key: string) => {
              ops.push(async () => {
                const current = (mockStorage.get(key) || 0) + 1;
                mockStorage.set(key, current);
                return current;
              });
              return null as any;
            },
            expire: () => {
              ops.push(async () => 'OK');
              return null as any;
            },
            exec: async () => {
              const results = [];
              for (const op of ops) {
                results.push(await op());
              }
              return results;
            },
          };
        },
      } as unknown as Redis;

      setCustomRedisClientForTesting(mockRedis);

      const req = createMockRequest('172.16.0.5');

      // Request 1 & 2 allowed
      const res1 = await checkRateLimit(req, 2);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = await checkRateLimit(req, 2);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(0);

      // Request 3 exceeds per-IP
      const res3 = await checkRateLimit(req, 2);
      expect(res3.allowed).toBe(false);
      expect(res3.reason).toContain('Rate limit exceeded');
    });

    it('enforces persistent global daily cap across multiple IPs in Redis', async () => {
      const mockStorage = new Map<string, number>();

      const mockRedis = {
        pipeline: () => {
          const ops: Array<() => Promise<number | string>> = [];
          return {
            incr: (key: string) => {
              ops.push(async () => {
                const current = (mockStorage.get(key) || 0) + 1;
                mockStorage.set(key, current);
                return current;
              });
              return null as any;
            },
            expire: () => {
              ops.push(async () => 'OK');
              return null as any;
            },
            exec: async () => {
              const results = [];
              for (const op of ops) {
                results.push(await op());
              }
              return results;
            },
          };
        },
      } as unknown as Redis;

      setCustomRedisClientForTesting(mockRedis);
      process.env.DAILY_REQUEST_CAP = '3';

      // 3 requests from different IPs
      for (let i = 1; i <= 3; i++) {
        const req = createMockRequest(`10.200.0.${i}`);
        const res = await checkRateLimit(req, 10);
        expect(res.allowed).toBe(true);
      }

      // 4th request from another IP hits the persistent daily cap
      const req4 = createMockRequest('10.200.0.99');
      const res4 = await checkRateLimit(req4, 10);
      expect(res4.allowed).toBe(false);
      expect(res4.isDailyCapExceeded).toBe(true);
      expect(res4.reason).toContain('Instant replay');
    });
  });
});

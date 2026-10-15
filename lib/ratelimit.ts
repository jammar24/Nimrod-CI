import { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
  isDailyCapExceeded?: boolean;
}

interface IpRecord {
  count: number;
  resetAt: number;
}

interface DailyRecord {
  dateStr: string;
  totalRequests: number;
}

// In-memory sliding window fallback counters (used locally and in unit tests)
const inMemoryIpCache = new Map<string, IpRecord>();
let inMemoryDailyRecord: DailyRecord = {
  dateStr: new Date().toISOString().slice(0, 10),
  totalRequests: 0,
};

// Redis client singleton (instantiated if credentials present)
let redisClient: Redis | null = null;
let redisInitialized = false;

export function getRedisClient(): Redis | null {
  if (redisInitialized) {
    return redisClient;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      redisClient = new Redis({ url, token });
    } catch (e) {
      console.warn('[RateLimit] Failed to initialize Redis client, falling back to memory:', e);
      redisClient = null;
    }
  }

  redisInitialized = true;
  return redisClient;
}

export function setCustomRedisClientForTesting(client: Redis | null): void {
  redisClient = client;
  redisInitialized = true;
}

/**
 * Extracts client IP safely from Next.js request headers.
 * Takes the first IP in x-forwarded-for or falls back to x-real-ip.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Checks both per-IP rate limit and global daily request budget cap.
 * Default: 20 requests per minute per IP, and 300 total requests per day.
 * Uses persistent Upstash Redis / Vercel KV when configured, falling back to memory.
 */
export async function checkRateLimit(
  req: NextRequest,
  ipLimitPerMin: number = 20
): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const now = Date.now();
  const todayUtc = new Date().toISOString().slice(0, 10);
  const minuteEpoch = Math.floor(now / 60000);
  const dailyCap = parseInt(process.env.DAILY_REQUEST_CAP || '300', 10);

  const redis = getRedisClient();

  if (redis) {
    try {
      const dailyKey = `ratelimit:daily:${todayUtc}`;
      const ipKey = `ratelimit:ip:${ip}:${minuteEpoch}`;

      // Pipeline increments and expiration setting
      const pipe = redis.pipeline();
      pipe.incr(dailyKey);
      pipe.expire(dailyKey, 172800); // 48h TTL
      pipe.incr(ipKey);
      pipe.expire(ipKey, 120); // 2min TTL

      const results = await pipe.exec();
      const dailyCount = (results[0] as number) || 1;
      const ipCount = (results[2] as number) || 1;

      // 1. Check Global Daily Cap
      if (dailyCount > dailyCap) {
        return {
          allowed: false,
          remaining: 0,
          isDailyCapExceeded: true,
          reason: `Daily demo budget cap reached (${dailyCap} requests/day). To test without burning credits, please use the sample results (pre-loaded examples).`,
        };
      }

      // 2. Check Per-IP Rate Limit
      if (ipCount > ipLimitPerMin) {
        return {
          allowed: false,
          remaining: 0,
          isDailyCapExceeded: false,
          reason: `Rate limit exceeded. Please wait a moment before sending more requests.`,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, ipLimitPerMin - ipCount),
      };
    } catch (err) {
      console.warn('[RateLimit] Upstash Redis request failed, falling back to memory:', err);
      // Fall through to in-memory evaluation
    }
  }

  // In-Memory Fallback
  // 1. Check Global Daily Cap
  if (inMemoryDailyRecord.dateStr !== todayUtc) {
    inMemoryDailyRecord = {
      dateStr: todayUtc,
      totalRequests: 0,
    };
  }

  if (inMemoryDailyRecord.totalRequests >= dailyCap) {
    return {
      allowed: false,
      remaining: 0,
      isDailyCapExceeded: true,
      reason: `Daily demo budget cap reached (${dailyCap} requests/day). To test without burning credits, please use the sample results (pre-loaded examples).`,
    };
  }

  // 2. Check Per-IP Rate Limit
  let record = inMemoryIpCache.get(ip);
  if (!record || now > record.resetAt) {
    record = {
      count: 1,
      resetAt: now + 60 * 1000,
    };
    inMemoryIpCache.set(ip, record);
  } else {
    record.count++;
  }

  if (record.count > ipLimitPerMin) {
    return {
      allowed: false,
      remaining: 0,
      isDailyCapExceeded: false,
      reason: `Rate limit exceeded. Please wait a moment before sending more requests.`,
    };
  }

  // Increment in-memory counter
  inMemoryDailyRecord.totalRequests++;

  return {
    allowed: true,
    remaining: Math.max(0, ipLimitPerMin - record.count),
  };
}

/**
 * Resets rate limit records (used in test suites).
 */
export function resetRateLimitsForTesting(): void {
  inMemoryIpCache.clear();
  inMemoryDailyRecord = {
    dateStr: new Date().toISOString().slice(0, 10),
    totalRequests: 0,
  };
  redisClient = null;
  redisInitialized = false;
}

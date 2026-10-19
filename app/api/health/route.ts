import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const trackedVars = [
    'NEBIUS_API_KEY',
    'NEBIUS_BASE_URL',
    'NEBIUS_MODEL_PRIMARY',
    'NEBIUS_MODEL_FAST',
    'TAVILY_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'MAX_DIFF_CHARS',
    'MAX_VERIFY_ITERATIONS',
    'DAILY_REQUEST_CAP',
  ];

  const envStatus: Record<string, '<set>' | '<missing>'> = {};
  for (const v of trackedVars) {
    envStatus[v] = process.env[v] && process.env[v]!.trim().length > 0 ? '<set>' : '<missing>';
  }

  const primaryModel = process.env.NEBIUS_MODEL_PRIMARY || 'nvidia/nemotron-3-super-120b-a12b';
  const fastModel = process.env.NEBIUS_MODEL_FAST || 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B';
  const hasRedis = getRedisClient() !== null;
  const isProductionReady = envStatus['NEBIUS_API_KEY'] === '<set>';

  return NextResponse.json({
    status: 'ok',
    service: 'Nimrod-CI',
    version: '1.0.0',
    productionReady: isProductionReady,
    rateLimiting: {
      mode: hasRedis ? 'persistent_redis_kv' : 'in_memory_sliding_window',
      dailyCap: parseInt(process.env.DAILY_REQUEST_CAP || '300', 10),
      ipLimitPerMin: 20,
    },
    integrations: {
      nebiusTokenFactory: {
        configured: envStatus['NEBIUS_API_KEY'] === '<set>',
        primaryModel,
        fastModel,
      },
      tavilyThreatIntelligence: {
        configured: envStatus['TAVILY_API_KEY'] === '<set>',
        failSoftEnabled: true,
      },
      upstashRedisKV: {
        configured: hasRedis,
      },
      githubPR: {
        configured: true,
        supportedOperations: ['fetch-pr', 'create-pr', 'export-sarif'],
      },
      securityHeaders: {
        hsts: true,
        contentSecurityPolicy: true,
        noSniff: true,
        frameAncestorsNone: true,
        crossOriginOpenerPolicy: true,
      },
    },
    documentation: '/docs',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    endpoints: [
      { path: '/api/health', methods: ['GET'], description: 'System health, model configuration, and environment diagnostics' },
      { path: '/api/examples', methods: ['GET'], description: 'Curated security vulnerability fixtures for instant testing' },
      { path: '/api/triage', methods: ['POST'], description: 'Fast screening and extraction of suspicious hunks' },
      { path: '/api/analyze', methods: ['POST'], description: 'Deep SAST reasoning and vulnerability assessment' },
      { path: '/api/enrich', methods: ['POST'], description: 'Tavily web threat intelligence and OWASP references' },
      { path: '/api/patch', methods: ['POST'], description: 'Autonomous minimal unified diff patch synthesis' },
      { path: '/api/verify', methods: ['POST'], description: 'AST compiler validation and model re-analysis' },
      { path: '/api/github', methods: ['GET', 'POST'], description: 'GitHub Pull Request inspection and automated PR creation' },
    ],
  });
}

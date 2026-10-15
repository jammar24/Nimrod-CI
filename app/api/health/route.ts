import { NextResponse } from 'next/server';

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

  const primaryModel = process.env.NEBIUS_MODEL_PRIMARY || 'not configured';
  const fastModel = process.env.NEBIUS_MODEL_FAST || 'not configured';

  return NextResponse.json({
    status: 'ok',
    service: 'Nimrod-CI',
    timestamp: new Date().toISOString(),
    environment: envStatus,
    models: {
      primary: primaryModel,
      fast: fastModel,
    },
  });
}

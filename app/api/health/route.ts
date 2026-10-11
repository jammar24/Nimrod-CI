import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Sentinel-CI',
    timestamp: new Date().toISOString(),
  });
}

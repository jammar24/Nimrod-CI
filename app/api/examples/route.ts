import { NextResponse } from 'next/server';
import { SECURITY_FIXTURES } from '@/lib/examples';

export async function GET() {
  // Return list of examples with metadata and diffs (omitting heavy cached results in listing if desired, but here we provide full examples for instant replay)
  return NextResponse.json({
    examples: SECURITY_FIXTURES,
  });
}

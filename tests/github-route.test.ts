import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/github/route';

describe('/api/github Route Handler', () => {
  it('returns 400 for unknown or missing action', async () => {
    const req = new NextRequest('http://localhost:3000/api/github', {
      method: 'POST',
      body: JSON.stringify({ action: 'unknown-action' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown action');
  });

  it('returns 400 when fetch-pr is missing prUrl', async () => {
    const req = new NextRequest('http://localhost:3000/api/github', {
      method: 'POST',
      body: JSON.stringify({ action: 'fetch-pr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing or invalid "prUrl"');
  });

  it('returns 400 when fetch-pr receives invalid URL format', async () => {
    const req = new NextRequest('http://localhost:3000/api/github', {
      method: 'POST',
      body: JSON.stringify({ action: 'fetch-pr', prUrl: 'not_a_valid_pr' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid GitHub Pull Request URL');
  });

  it('returns 400 when create-pr is missing required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/github', {
      method: 'POST',
      body: JSON.stringify({ action: 'create-pr', owner: 'test' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DELETE /address', () => {
  beforeEach(async () => {
    // Pre-populate KV with a temp address entry
    await env.KV.put(
      'addr:a7k9x3mq',
      JSON.stringify({ publicKey: { kty: 'RSA' }, createdAt: '2026-01-01T00:00:00Z' })
    );
  });

  it('removes KV entry and returns success for valid slug', async () => {
    const ctx = createExecutionContext();
    const req = new Request('https://api.erasurekit.uk/address?slug=a7k9x3mq', {
      method: 'DELETE',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.deleted).toBe('a7k9x3mq');

    // Verify KV entry is gone
    const kvValue = await env.KV.get('addr:a7k9x3mq');
    expect(kvValue).toBeNull();
  });

  it('returns INVALID_PAYLOAD 400 when slug is missing', async () => {
    const ctx = createExecutionContext();
    const req = new Request('https://api.erasurekit.uk/address', {
      method: 'DELETE',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_PAYLOAD');
  });

  it('includes CORS headers on response', async () => {
    const ctx = createExecutionContext();
    const req = new Request('https://api.erasurekit.uk/address?slug=a7k9x3mq', {
      method: 'DELETE',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

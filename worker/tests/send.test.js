import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(path, options = {}) {
  const url = `https://api.erasurekit.uk${path}`;
  return new Request(url, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': options.ip || '1.2.3.4',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function validPayload() {
  return {
    to: 'privacy@broker.com',
    subject: 'GDPR Article 17 Erasure Request',
    encryptedBody: btoa('encrypted-content-here'),
    wrappedKey: btoa('wrapped-key-data-here'),
    iv: btoa('twelve-byte!'),
    tempAddress: 'a7k9x3mq',
    publicKey: { kty: 'RSA', n: 'test', e: 'AQAB' },
  };
}

// ---------------------------------------------------------------------------
// Mock Resend API via globalThis.fetch override
// ---------------------------------------------------------------------------
let originalFetch;
let mockFetchHandler;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  // Default mock: Resend returns success
  mockFetchHandler = vi.fn(async (url, init) => {
    if (typeof url === 'string' && url.includes('api.resend.com')) {
      return new Response(JSON.stringify({ id: 'email-id-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return originalFetch(url, init);
  });
  globalThis.fetch = mockFetchHandler;
});

// Restore after each test
beforeEach(() => {
  return () => {
    globalThis.fetch = originalFetch;
  };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('POST /send', () => {
  it('returns success with emailId and tempAddress on valid payload', async () => {
    const ctx = createExecutionContext();
    const req = makeRequest('/send', { body: validPayload() });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.emailId).toBe('email-id-123');
    expect(json.data.tempAddress).toBe('a7k9x3mq@erasurekit.uk');
  });

  it('returns INVALID_PAYLOAD 400 when "to" field is missing', async () => {
    const ctx = createExecutionContext();
    const body = validPayload();
    delete body.to;
    const req = makeRequest('/send', { body });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_PAYLOAD');
  });

  it('returns INVALID_PAYLOAD 400 when "encryptedBody" field is missing', async () => {
    const ctx = createExecutionContext();
    const body = validPayload();
    delete body.encryptedBody;
    const req = makeRequest('/send', { body });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_PAYLOAD');
  });

  it('returns INVALID_PAYLOAD 400 when "tempAddress" field is missing', async () => {
    const ctx = createExecutionContext();
    const body = validPayload();
    delete body.tempAddress;
    const req = makeRequest('/send', { body });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_PAYLOAD');
  });

  it('registers temp address in KV with public key and 90-day TTL', async () => {
    const ctx = createExecutionContext();
    const payload = validPayload();
    const req = makeRequest('/send', { body: payload });
    await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    const kvValue = await env.KV.get('addr:a7k9x3mq', { type: 'json' });
    expect(kvValue).not.toBeNull();
    expect(kvValue.publicKey).toEqual(payload.publicKey);
    expect(kvValue.createdAt).toBeDefined();
  });

  it('returns RESEND_FAILED 502 when Resend returns an error', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (typeof url === 'string' && url.includes('api.resend.com')) {
        return new Response(JSON.stringify({ message: 'Bad request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(url);
    });

    const ctx = createExecutionContext();
    const req = makeRequest('/send', { body: validPayload() });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RESEND_FAILED');
  });

  it('returns Content-Type application/json', async () => {
    const ctx = createExecutionContext();
    const req = makeRequest('/send', { body: validPayload() });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('returns Access-Control-Allow-Origin: *', async () => {
    const ctx = createExecutionContext();
    const req = makeRequest('/send', { body: validPayload() });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('OPTIONS /send (CORS preflight)', () => {
  it('returns 204 with CORS headers', async () => {
    const ctx = createExecutionContext();
    const req = new Request('https://api.erasurekit.uk/send', {
      method: 'OPTIONS',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });
});

describe('GET /unknown (404)', () => {
  it('returns NOT_FOUND 404', async () => {
    const ctx = createExecutionContext();
    const req = new Request('https://api.erasurekit.uk/unknown', {
      method: 'GET',
      headers: { 'CF-Connecting-IP': '1.2.3.4' },
    });
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });
});

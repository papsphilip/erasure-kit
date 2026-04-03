import { describe, it, expect, vi, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { checkRateLimit } from '../src/lib/rate-limit.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const LIMIT = 10;
const WINDOW_SEC = 60;
const TEST_IP = '192.168.1.1';

describe('Rate limiter', () => {
  it('allows requests under the limit', async () => {
    const result = await checkRateLimit(env, TEST_IP, LIMIT, WINDOW_SEC);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(LIMIT - 1);
  });

  it('blocks requests over the limit with RATE_LIMITED and retryAfter', async () => {
    // Fill up the rate limit
    for (let i = 0; i < LIMIT; i++) {
      await checkRateLimit(env, TEST_IP, LIMIT, WINDOW_SEC);
    }

    const result = await checkRateLimit(env, TEST_IP, LIMIT, WINDOW_SEC);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(WINDOW_SEC);
  });

  it('uses IP + minute-bucket key pattern to avoid KV write-per-second limit', async () => {
    // Spy on KV.put to inspect the key format
    const putSpy = vi.spyOn(env.KV, 'put');

    await checkRateLimit(env, '10.0.0.1', LIMIT, WINDOW_SEC);

    expect(putSpy).toHaveBeenCalled();
    const key = putSpy.mock.calls[0][0];
    // Key should start with "rate:" and include the IP and a time bucket
    expect(key).toMatch(/^rate:10\.0\.0\.1:\d+$/);

    putSpy.mockRestore();
  });
});

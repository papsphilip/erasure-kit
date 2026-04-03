// ---------------------------------------------------------------------------
// KV-based IP rate limiter
// ---------------------------------------------------------------------------
// Uses IP + minute-bucket key pattern to avoid KV's 1-write/sec per-key limit
// (Pitfall 4 from RESEARCH.md).
// ---------------------------------------------------------------------------

// Configuration
const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SEC = 60;

/**
 * Check if an IP is within its rate limit.
 *
 * @param {{ KV: KVNamespace }} env  - Worker environment bindings
 * @param {string} ip                - Client IP address
 * @param {number} [limit]           - Max requests per window (default 10)
 * @param {number} [windowSec]       - Window duration in seconds (default 60)
 * @returns {Promise<{ allowed: boolean, remaining: number, retryAfter?: number }>}
 */
export async function checkRateLimit(env, ip, limit = DEFAULT_LIMIT, windowSec = DEFAULT_WINDOW_SEC) {
  // Minute-bucket key: rate:{ip}:{bucket}
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rate:${ip}:${bucket}`;

  const current = parseInt(await env.KV.get(key)) || 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0, retryAfter: windowSec };
  }

  // Increment counter with TTL = 2x window for safety
  await env.KV.put(key, String(current + 1), { expirationTtl: windowSec * 2 });

  return { allowed: true, remaining: limit - current - 1 };
}

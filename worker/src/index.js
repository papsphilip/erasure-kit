// ---------------------------------------------------------------------------
// ErasureKit Relay Worker -- Entry Point
// ---------------------------------------------------------------------------
// Stateless Cloudflare Worker that relays encrypted email payloads to
// the Resend API from temporary @erasurekit.uk addresses.
// ---------------------------------------------------------------------------
import { handleSend } from './routes/send.js';
import { handleDeleteAddress } from './routes/address.js';
import { handleCORS, corsHeaders } from './lib/cors.js';

/**
 * Create a JSON Response with CORS headers merged in.
 *
 * @param {object} body              - Response body (will be JSON.stringify'd)
 * @param {number} [status=200]      - HTTP status code
 * @param {Record<string, string>} [extraHeaders={}] - Additional headers
 * @returns {Response}
 */
export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

export default {
  /**
   * Worker fetch handler -- route dispatch.
   *
   * @param {Request} request
   * @param {{ KV: KVNamespace, RESEND_API_KEY: string }} env
   * @param {ExecutionContext} ctx
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    // CORS preflight (must be first -- applies to all paths)
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    const url = new URL(request.url);
    const { pathname } = url;

    // Route dispatch
    if (pathname === '/send' && request.method === 'POST') {
      return handleSend(request, env);
    }

    if (pathname === '/address' && request.method === 'DELETE') {
      return handleDeleteAddress(request, env);
    }

    // Unknown endpoint
    return jsonResponse(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } },
      404
    );
  },
};

// ---------------------------------------------------------------------------
// DELETE /address handler
// ---------------------------------------------------------------------------
import { validateDeletePayload } from '../lib/validate.js';
import { jsonResponse } from '../index.js';

/**
 * Handle DELETE /address?slug=... -- remove temp address from KV.
 *
 * @param {Request} request
 * @param {{ KV: KVNamespace }} env
 * @returns {Promise<Response>}
 */
export async function handleDeleteAddress(request, env) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  // Validate slug
  const validation = validateDeletePayload(slug);
  if (!validation.valid) {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_PAYLOAD', message: validation.reason } },
      400
    );
  }

  // Delete from KV (D-07: user-controlled cleanup)
  await env.KV.delete(`addr:${slug}`);

  return jsonResponse({ success: true, data: { deleted: slug } });
}

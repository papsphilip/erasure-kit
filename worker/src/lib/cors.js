// ---------------------------------------------------------------------------
// CORS helpers (D-02: Access-Control-Allow-Origin: *)
// ---------------------------------------------------------------------------

/**
 * Returns CORS headers object for merging into all responses.
 * @returns {Record<string, string>}
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * Handles CORS preflight (OPTIONS) requests.
 * @returns {Response} 204 No Content with CORS headers
 */
export function handleCORS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

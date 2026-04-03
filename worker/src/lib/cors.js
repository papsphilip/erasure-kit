// CORS helpers -- stub for TDD RED phase
export function corsHeaders() {
  return {};
}

export function handleCORS() {
  return new Response(null, { status: 501 });
}

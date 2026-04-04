// ---------------------------------------------------------------------------
// Relay client — fetch() wrapper for Worker API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Configuration (move to config file or DB when this module stabilizes)
// ---------------------------------------------------------------------------
export const RELAY_URL = 'https://api.erasurekit.uk';

// ---------------------------------------------------------------------------
// POST /send — send an encrypted email payload through the relay
// ---------------------------------------------------------------------------

/**
 * Send an encrypted email payload through the relay Worker.
 *
 * @param {{ to: string, subject: string, encryptedBody: string, wrappedKey: string, iv: string, tempAddress: string, publicKey: string }} payload
 * @returns {Promise<{ success: boolean, data?: { emailId: string, tempAddress: string }, error?: { code: string, message: string }, retryAfter?: number }>}
 */
export async function relaySend(payload) {
  const response = await fetch(`${RELAY_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  // Extract Retry-After header on 429 responses
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
    return { ...result, retryAfter };
  }

  return result;
}

// ---------------------------------------------------------------------------
// DELETE /address — delete a temporary address via the relay
// ---------------------------------------------------------------------------

/**
 * Delete a temporary address through the relay Worker.
 *
 * @param {string} slug - 8-character alphanumeric slug (e.g. 'a7k9x3mq')
 * @returns {Promise<{ success: boolean, data?: { deleted: string }, error?: { code: string, message: string } }>}
 */
export async function relayDeleteAddress(slug) {
  const response = await fetch(`${RELAY_URL}/address?slug=${slug}`, {
    method: 'DELETE',
  });

  return response.json();
}

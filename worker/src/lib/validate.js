// ---------------------------------------------------------------------------
// Request payload validation
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]{8}$/;

/**
 * Validates the POST /send request body.
 * @param {Record<string, unknown>} body
 * @returns {{ valid: true } | { valid: false, field: string, reason: string }}
 */
export function validateSendPayload(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, field: 'body', reason: 'Request body must be a JSON object' };
  }

  if (typeof body.to !== 'string' || !body.to.includes('@')) {
    return { valid: false, field: 'to', reason: 'Must be a valid email address' };
  }

  if (typeof body.subject !== 'string' || body.subject.length === 0) {
    return { valid: false, field: 'subject', reason: 'Must be a non-empty string' };
  }

  if (typeof body.encryptedBody !== 'string' || body.encryptedBody.length === 0) {
    return { valid: false, field: 'encryptedBody', reason: 'Must be a non-empty string' };
  }

  if (typeof body.wrappedKey !== 'string' || body.wrappedKey.length === 0) {
    return { valid: false, field: 'wrappedKey', reason: 'Must be a non-empty string' };
  }

  if (typeof body.iv !== 'string' || body.iv.length === 0) {
    return { valid: false, field: 'iv', reason: 'Must be a non-empty string' };
  }

  if (typeof body.tempAddress !== 'string' || !SLUG_PATTERN.test(body.tempAddress)) {
    return { valid: false, field: 'tempAddress', reason: 'Must be 8 alphanumeric characters' };
  }

  return { valid: true };
}

/**
 * Validates the DELETE /address slug parameter.
 * @param {string | null} slug
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
export function validateDeletePayload(slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return { valid: false, reason: 'Slug must be 8 alphanumeric characters' };
  }
  return { valid: true };
}

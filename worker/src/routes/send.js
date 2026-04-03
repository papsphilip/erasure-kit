// ---------------------------------------------------------------------------
// POST /send handler
// ---------------------------------------------------------------------------
import { validateSendPayload } from '../lib/validate.js';
import { checkRateLimit } from '../lib/rate-limit.js';
import { sendEmail } from '../lib/resend.js';
import { jsonResponse } from '../index.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const DOMAIN = 'erasurekit.uk';
const KV_TTL_SECONDS = 7776000; // 90 days (D-08)

/**
 * Handle POST /send -- validate, rate-limit, register temp address, send email.
 *
 * @param {Request} request
 * @param {{ KV: KVNamespace, RESEND_API_KEY: string }} env
 * @returns {Promise<Response>}
 */
export async function handleSend(request, env) {
  // 1. Parse JSON body
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { success: false, error: { code: 'INVALID_PAYLOAD', message: 'Invalid JSON body' } },
      400
    );
  }

  // 2. Validate payload
  const validation = validateSendPayload(body);
  if (!validation.valid) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: `Invalid field "${validation.field}": ${validation.reason}`,
        },
      },
      400
    );
  }

  // 3. Rate limit check
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const rateResult = await checkRateLimit(env, ip);
  if (!rateResult.allowed) {
    return jsonResponse(
      { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      429,
      { 'Retry-After': String(rateResult.retryAfter) }
    );
  }

  // 4. Construct sender address
  const sender = `${body.tempAddress}@${DOMAIN}`;

  // 5. Register temp address in KV with public key (D-06, D-08)
  await env.KV.put(
    `addr:${body.tempAddress}`,
    JSON.stringify({
      publicKey: body.publicKey,
      createdAt: new Date().toISOString(),
    }),
    { expirationTtl: KV_TTL_SECONDS }
  );

  // 6. Send email via Resend (D-14: Reply-To = same temp address)
  const result = await sendEmail(env, {
    from: sender,
    to: body.to,
    subject: body.subject,
    html: body.encryptedBody,
    replyTo: sender,
  });

  // 7. Handle Resend response
  if (result.success) {
    return jsonResponse({
      success: true,
      data: { emailId: result.emailId, tempAddress: sender },
    });
  }

  if (result.code === 'RATE_LIMITED') {
    return jsonResponse(
      { success: false, error: { code: 'RATE_LIMITED', message: 'Resend rate limit exceeded' } },
      429,
      { 'Retry-After': result.retryAfter || '60' }
    );
  }

  return jsonResponse(
    { success: false, error: { code: 'RESEND_FAILED', message: result.message || 'Email delivery failed' } },
    502
  );
}

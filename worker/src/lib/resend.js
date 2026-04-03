// ---------------------------------------------------------------------------
// Resend API client (direct fetch -- no SDK dependency)
// ---------------------------------------------------------------------------
// Pitfall 2 from RESEARCH.md: User-Agent header is required by Resend.
// ---------------------------------------------------------------------------

const RESEND_API_URL = 'https://api.resend.com/emails';
const USER_AGENT = 'ErasureKit-Worker/1.0';
const DOMAIN = 'erasurekit.uk';

/**
 * Send an email via Resend REST API.
 *
 * @param {{ RESEND_API_KEY: string }} env
 * @param {{ from: string, to: string, subject: string, html: string, replyTo: string }} options
 * @returns {Promise<{ success: true, emailId: string } | { success: false, code: string, statusCode?: number, message?: string, retryAfter?: string }>}
 */
export async function sendEmail(env, { from, to, subject, html, replyTo }) {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
    }),
  });

  const data = await response.json();

  if (response.ok) {
    return { success: true, emailId: data.id };
  }

  if (response.status === 429) {
    return {
      success: false,
      code: 'RATE_LIMITED',
      retryAfter: response.headers.get('Retry-After') || '60',
    };
  }

  return {
    success: false,
    code: 'RESEND_FAILED',
    statusCode: response.status,
    message: data.message || 'Unknown Resend error',
  };
}

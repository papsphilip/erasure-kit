import { demoMode } from './demo-mode.js';

/** Maximum mailto: URL length before falling back to clipboard */
export const MAILTO_LIMIT = 2000;

/**
 * Build a mailto: URL with pre-filled subject and body.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {string} mailto: URL string
 */
export function buildMailtoUrl(to, subject, body) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Send an erasure request to a single broker.
 * In demo mode, simulates the send without opening mailto: or clipboard.
 *
 * @param {{ id: string, name: string, email: string }} broker - Broker to send to
 * @param {{ subject?: string, body?: string, onSent?: function }} options - Send options
 * @returns {{ method: string, success: boolean }}
 */
export function sendToBroker(broker, options = {}) {
  // Demo mode interception: simulate send without triggering real actions
  if (demoMode.value) {
    console.log('[Demo Mode] Simulated send to:', broker.name, broker.email);

    // Notify via callback if provided (Phase 5 will wire full notifications)
    if (options.onSent) {
      options.onSent(broker.id, 'demo');
    }

    return { method: 'demo', success: true };
  }

  // Normal send path: build mailto: URL and open in email client
  const { subject = '', body = '' } = options;
  const mailtoUrl = buildMailtoUrl(broker.email, subject, body);

  if (mailtoUrl.length <= MAILTO_LIMIT) {
    window.open(mailtoUrl, '_blank');
    if (options.onSent) {
      options.onSent(broker.id, 'mailto');
    }
    return { method: 'mailto', success: true };
  }

  // URL too long -- fall back to clipboard
  return { method: 'clipboard', success: false };
}

/**
 * Send erasure requests to multiple brokers in batch.
 * Calls sendToBroker for each, which respects demo mode automatically.
 *
 * @param {Array<{ id: string, name: string, email: string }>} brokers - Brokers to send to
 * @param {{ subject?: string, body?: string, onSent?: function }} options - Send options
 * @returns {Promise<{ sent: number, failed: number, clipboard: number }>}
 */
export async function batchSend(brokers, options = {}) {
  let sent = 0;
  let failed = 0;
  let clipboard = 0;

  for (const broker of brokers) {
    const result = sendToBroker(broker, options);
    if (result.success) {
      sent++;
    } else if (result.method === 'clipboard') {
      clipboard++;
    } else {
      failed++;
    }
  }

  return { sent, failed, clipboard };
}

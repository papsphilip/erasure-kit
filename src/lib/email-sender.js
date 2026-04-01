import { campaign } from './campaign.js';
import { getTemplateForBroker } from './template-engine.js';
import { markBrokerSent, getBrokerStatusValue, STATUS } from './status-tracker.js';
import { copyToClipboard } from './clipboard.js';

// ── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum mailto: URL length before falling back to clipboard (SEND-04).
 * Most browsers limit mailto: URIs to ~2000 characters.
 */
export const MAILTO_LIMIT = 2000;

// ── Single Broker Send ───────────────────────────────────────────────────────

/**
 * Send an erasure request to a single broker via mailto: URI (SEND-01).
 * If the mailto: URL exceeds MAILTO_LIMIT, falls back to clipboard copy (SEND-04).
 * @param {object} broker - Broker object { id, name, email, legalFramework, ... }
 * @param {object} [options] - { identity, customTemplates }
 * @returns {{ method: 'mailto'|'clipboard', success: boolean }}
 */
export function sendToBroker(broker, options = {}) {
  const identity = options.identity || campaign.value.identity;
  const customTemplates = options.customTemplates || campaign.value.brokers.templates || {};
  const { subject, body } = getTemplateForBroker(identity, broker, customTemplates);

  const mailtoUrl = buildMailtoUrl(broker.email, subject, body);

  if (mailtoUrl.length > MAILTO_LIMIT) {
    // Fallback to clipboard (SEND-04)
    const fullText = `To: ${broker.email}\nSubject: ${subject}\n\n${body}`;
    copyToClipboard(fullText);
    markBrokerSent(broker.id);
    return { method: 'clipboard', success: true };
  }

  // Open mailto: link (SEND-01)
  window.open(mailtoUrl, '_self');
  markBrokerSent(broker.id);
  return { method: 'mailto', success: true };
}

/**
 * Build a mailto: URL with encoded subject and body.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @returns {string} mailto: URL
 */
export function buildMailtoUrl(to, subject, body) {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ── Batch Send ───────────────────────────────────────────────────────────────

/**
 * Batch send erasure requests to multiple brokers (SEND-02).
 * Sequential sending with delay to avoid overwhelming the email client.
 * Skips brokers that have already been sent.
 *
 * @param {Array} brokers - Array of broker objects to send to
 * @param {object} [options] - Configuration
 * @param {number} [options.delayMs=1500] - Delay between sends (ms)
 * @param {function} [options.onProgress] - Callback: ({ current, total, broker, method, failed })
 * @param {function} [options.onComplete] - Callback: ({ sent, failed, clipboard, total })
 * @param {AbortSignal} [options.signal] - AbortSignal to cancel batch
 * @returns {Promise<{ sent: number, failed: number, clipboard: number }>}
 */
export async function batchSend(brokers, options = {}) {
  const { delayMs = 1500, onProgress, onComplete, signal: abortSignal } = options;

  // Filter to only unsent selected brokers
  const toSend = brokers.filter((b) => {
    const status = getBrokerStatusValue(b.id);
    return status === STATUS.SELECTED || status === STATUS.NOT_SELECTED;
  });

  let sent = 0;
  let failed = 0;
  let clipboard = 0;

  for (let i = 0; i < toSend.length; i++) {
    // Check for abort
    if (abortSignal && abortSignal.aborted) {
      break;
    }

    const broker = toSend[i];

    try {
      const result = sendToBroker(broker);
      if (result.method === 'clipboard') {
        clipboard++;
      }
      sent++;
    } catch (err) {
      console.error(`Failed to send to ${broker.name}:`, err);
      failed++;
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: toSend.length,
        broker: broker,
        method: clipboard > 0 ? 'clipboard' : 'mailto',
        failed,
      });
    }

    // Delay between sends (except for last one)
    if (i < toSend.length - 1 && delayMs > 0) {
      await sleep(delayMs, abortSignal);
    }
  }

  const result = { sent, failed, clipboard, total: toSend.length };

  if (onComplete) {
    onComplete(result);
  }

  return result;
}

/**
 * Get the count of unsent brokers from the selected list.
 * @returns {number}
 */
export function getUnsentCount() {
  const selected = campaign.value.brokers.selected || [];
  const statuses = campaign.value.statuses || {};
  return selected.filter((id) => {
    const entry = statuses[id];
    return !entry || entry.status === STATUS.SELECTED || entry.status === STATUS.NOT_SELECTED;
  }).length;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms, abortSignal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    }
  });
}

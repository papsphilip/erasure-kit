import { campaign } from './campaign.js';
import { getTemplateForBroker } from './template-engine.js';
import { markBrokerSent, markBrokerFailed, getBrokerStatusValue, STATUS } from './status-tracker.js';
import { relaySend } from './relay-client.js';
import { encryptEmailBody } from './crypto.js';
import { demoMode } from './demo-mode.js';

// ── Configuration ────────────────────────────────────────────────────────────

const RELAY_SEND_DELAY_MS = 500;
const DEMO_MIN_DELAY_MS = 300;
const DEMO_MAX_DELAY_MS = 700;
const DEMO_FAILURE_RATE = 0.125; // 1 in 8
const DEMO_RATE_LIMIT_RATE = 0.067; // ~1 in 15
const DEMO_RATE_LIMIT_SECONDS = 4;

// ── Single Broker Send ───────────────────────────────────────────────────────

/**
 * Send an erasure request to a single broker via the relay API.
 * Encrypts the template body with the campaign public key, then POSTs
 * the encrypted payload to the Worker relay.
 *
 * In demo mode: simulates realistic delays (300-700ms), occasional failures
 * (~1 in 8), and occasional rate limits (~1 in 15). No real API calls made.
 *
 * @param {object} broker - Broker object { id, name, email, legalFramework, ... }
 * @param {object} [options] - { identity, customTemplates }
 * @returns {Promise<{ success: boolean, method?: string, error?: object, retryAfter?: number }>}
 */
export async function sendToBroker(broker, options = {}) {
  const identity = options.identity || campaign.value.identity;
  const customTemplates = options.customTemplates || campaign.value.brokers.templates || {};
  const { subject, body } = getTemplateForBroker(identity, broker, customTemplates);

  // Demo mode: simulate the full relay flow (D-12)
  if (demoMode.value) {
    await sleep(DEMO_MIN_DELAY_MS + Math.random() * (DEMO_MAX_DELAY_MS - DEMO_MIN_DELAY_MS));

    // Simulate rate limit (~1 in 15)
    if (Math.random() < DEMO_RATE_LIMIT_RATE) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Demo rate limit' },
        retryAfter: DEMO_RATE_LIMIT_SECONDS,
      };
    }

    // Simulate failure (~1 in 8)
    if (Math.random() < DEMO_FAILURE_RATE) {
      return {
        success: false,
        error: { code: 'RESEND_FAILED', message: 'Simulated delivery failure' },
      };
    }

    markBrokerSent(broker.id);
    return { success: true, method: 'demo' };
  }

  // Real mode: encrypt and send via relay
  if (!campaign.value.encryption?.publicKeyJwk) {
    throw new Error('Campaign encryption keys not initialized. Start a new campaign.');
  }

  const encrypted = await encryptEmailBody(body, campaign.value.encryption.publicKeyJwk);

  const tempSlug = campaign.value.tempEmail?.split('@')[0];
  if (!tempSlug) {
    throw new Error('Campaign has no temp email address. Start a new campaign.');
  }

  const result = await relaySend({
    to: broker.email,
    subject,
    encryptedBody: encrypted.encryptedBody,
    wrappedKey: encrypted.wrappedKey,
    iv: encrypted.iv,
    tempAddress: tempSlug,
    publicKey: campaign.value.encryption.publicKeyJwk,
  });

  if (result.success) {
    markBrokerSent(broker.id);
    return { ...result, method: 'relay' };
  }

  // Error passthrough — caller handles RATE_LIMITED vs FAILED
  return result;
}

// ── Batch Send ───────────────────────────────────────────────────────────────

/**
 * Batch send erasure requests to multiple brokers through the relay.
 * Sequential sending with delay, rate-limit pause with auto-retry,
 * and failure tracking with markBrokerFailed.
 *
 * @param {Array} brokers - Array of broker objects to send to
 * @param {object} [options] - Configuration
 * @param {number} [options.delayMs=500] - Delay between sends (ms)
 * @param {function} [options.onProgress] - Callback: ({ current, total, broker, sent, failed })
 * @param {function} [options.onComplete] - Callback: ({ sent, failed, total })
 * @param {function} [options.onRateLimited] - Callback: ({ seconds, broker })
 * @param {AbortSignal} [options.signal] - AbortSignal to cancel batch
 * @returns {Promise<{ sent: number, failed: number, total: number }>}
 */
export async function batchSend(brokers, options = {}) {
  const {
    delayMs = RELAY_SEND_DELAY_MS,
    onProgress,
    onComplete,
    onRateLimited,
    signal: abortSignal,
  } = options;

  // Filter to unsent brokers: SELECTED, NOT_SELECTED, or FAILED (retry-all)
  const toSend = brokers.filter((b) => {
    const status = getBrokerStatusValue(b.id);
    return (
      status === STATUS.SELECTED ||
      status === STATUS.NOT_SELECTED ||
      status === STATUS.FAILED
    );
  });

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < toSend.length; i++) {
    // Check for abort
    if (abortSignal && abortSignal.aborted) {
      break;
    }

    const broker = toSend[i];
    const result = await sendToBroker(broker);

    // RATE_LIMITED handling (D-05): pause and retry same broker
    if (!result.success && result.error?.code === 'RATE_LIMITED') {
      const retryAfter = result.retryAfter || 60;
      onRateLimited?.({ seconds: retryAfter, broker });
      await sleep(retryAfter * 1000, abortSignal);
      i--; // retry same broker
      continue;
    }

    // FAILURE handling (RESEND_FAILED or INVALID_PAYLOAD)
    if (!result.success) {
      markBrokerFailed(broker.id, result.error.code, result.error.message);
      failed++;
    } else {
      // SUCCESS
      sent++;
    }

    onProgress?.({ current: i + 1, total: toSend.length, broker, sent, failed });

    // Delay between sends (except for last one)
    if (i < toSend.length - 1 && delayMs > 0) {
      await sleep(delayMs, abortSignal);
    }
  }

  const summary = { sent, failed, total: toSend.length };
  onComplete?.(summary);
  return summary;
}

// ── Unsent Count ─────────────────────────────────────────────────────────────

/**
 * Get the count of unsent brokers from the selected list.
 * Includes SELECTED, NOT_SELECTED, and FAILED (can be retried).
 * @returns {number}
 */
export function getUnsentCount() {
  const selected = campaign.value.brokers.selected || [];
  const statuses = campaign.value.statuses || {};
  return selected.filter((id) => {
    const entry = statuses[id];
    if (!entry) return true; // no status entry = unsent
    return (
      entry.status === STATUS.SELECTED ||
      entry.status === STATUS.NOT_SELECTED ||
      entry.status === STATUS.FAILED
    );
  }).length;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms, abortSignal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (abortSignal) {
      abortSignal.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
    }
  });
}

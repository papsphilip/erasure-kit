import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mock variables — accessible inside vi.mock() factories
// ---------------------------------------------------------------------------

const {
  mockRelaySend,
  mockEncryptEmailBody,
  mockGetTemplateForBroker,
  mockMarkBrokerSent,
  mockMarkBrokerFailed,
  mockGetBrokerStatusValue,
  mockCampaign,
  mockDemoMode,
  STATUS,
} = vi.hoisted(() => ({
  mockRelaySend: vi.fn(),
  mockEncryptEmailBody: vi.fn(),
  mockGetTemplateForBroker: vi.fn(),
  mockMarkBrokerSent: vi.fn(),
  mockMarkBrokerFailed: vi.fn(),
  mockGetBrokerStatusValue: vi.fn(),
  mockCampaign: { value: {} },
  mockDemoMode: { value: false },
  STATUS: {
    NOT_SELECTED: 'not_selected',
    SELECTED: 'selected',
    AWAITING: 'awaiting',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected',
    ESCALATED: 'escalated',
    OVERDUE: 'overdue',
    FAILED: 'failed',
  },
}));

// ---------------------------------------------------------------------------
// Mock declarations — factories reference hoisted variables
// ---------------------------------------------------------------------------

vi.mock('./relay-client.js', () => ({
  relaySend: mockRelaySend,
}));

vi.mock('./crypto.js', () => ({
  encryptEmailBody: mockEncryptEmailBody,
}));

vi.mock('./template-engine.js', () => ({
  getTemplateForBroker: mockGetTemplateForBroker,
}));

vi.mock('./status-tracker.js', () => ({
  STATUS,
  markBrokerSent: mockMarkBrokerSent,
  markBrokerFailed: mockMarkBrokerFailed,
  getBrokerStatusValue: mockGetBrokerStatusValue,
}));

vi.mock('./campaign.js', () => ({
  campaign: mockCampaign,
}));

vi.mock('./demo-mode.js', () => ({
  demoMode: mockDemoMode,
}));

// ---------------------------------------------------------------------------
// Import the module under test — mocks are already in place
// ---------------------------------------------------------------------------

import { sendToBroker, batchSend, getUnsentCount } from './email-sender.js';

describe('email-sender (relay-based)', () => {
  const testBroker = {
    id: 'acxiom',
    name: 'Acxiom',
    email: 'dpo@acxiom.com',
    legalFramework: 'GDPR',
    region: 'EU',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock return values
    mockGetTemplateForBroker.mockReturnValue({ subject: 'GDPR Request', body: 'Dear DPO...' });
    mockEncryptEmailBody.mockResolvedValue({ encryptedBody: 'enc', wrappedKey: 'key', iv: 'iv' });
    mockRelaySend.mockResolvedValue({
      success: true,
      data: { emailId: 'abc', tempAddress: 'slug1234@erasurekit.uk' },
    });

    // Default campaign state
    mockCampaign.value = {
      identity: { fullName: 'Jane Doe', emails: ['jane@example.com'] },
      brokers: { selected: [], templates: {} },
      encryption: { publicKeyJwk: { kty: 'RSA' } },
      tempEmail: 'slug1234@erasurekit.uk',
      statuses: {},
    };

    // Default: demo mode off
    mockDemoMode.value = false;
  });

  // ── sendToBroker tests ──────────────────────────────────────────────────

  describe('sendToBroker', () => {
    it('Test 1: calls encryptEmailBody with the template body and campaign publicKeyJwk', async () => {
      await sendToBroker(testBroker);
      expect(mockEncryptEmailBody).toHaveBeenCalledWith('Dear DPO...', { kty: 'RSA' });
    });

    it('Test 2: calls relaySend with correct payload shape', async () => {
      await sendToBroker(testBroker);
      expect(mockRelaySend).toHaveBeenCalledWith({
        to: 'dpo@acxiom.com',
        subject: 'GDPR Request',
        encryptedBody: 'enc',
        wrappedKey: 'key',
        iv: 'iv',
        tempAddress: 'slug1234',
        publicKey: { kty: 'RSA' },
      });
    });

    it('Test 3: calls markBrokerSent on relay success', async () => {
      await sendToBroker(testBroker);
      expect(mockMarkBrokerSent).toHaveBeenCalledWith('acxiom');
    });

    it('Test 4: returns { success: true, method: "relay" } on success', async () => {
      const result = await sendToBroker(testBroker);
      expect(result.success).toBe(true);
      expect(result.method).toBe('relay');
    });

    it('Test 5: returns error result on relay failure (does not throw)', async () => {
      mockRelaySend.mockResolvedValue({
        success: false,
        error: { code: 'RESEND_FAILED', message: 'Email delivery failed' },
      });
      const result = await sendToBroker(testBroker);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RESEND_FAILED');
    });

    it('Test 6: in demo mode returns result without calling relaySend or encryptEmailBody', async () => {
      mockDemoMode.value = true;
      const result = await sendToBroker(testBroker);

      // Should NOT call relay or encryption in demo mode
      expect(mockRelaySend).not.toHaveBeenCalled();
      expect(mockEncryptEmailBody).not.toHaveBeenCalled();

      // Result method should be 'demo' on success, or error code on simulated failure
      if (result.success) {
        expect(result.method).toBe('demo');
      } else {
        expect(['RATE_LIMITED', 'RESEND_FAILED']).toContain(result.error.code);
      }
    });

    it('Test 7: in demo mode occasionally returns simulated failure (~1 in 8)', async () => {
      mockDemoMode.value = true;
      const originalRandom = Math.random;

      // Force a success: all random values > 0.125 and > 0.067
      Math.random = () => 0.5;
      const successResult = await sendToBroker(testBroker);

      // Force a failure: sleep random, then skip rate limit (> 0.067), then trigger failure (< 0.125)
      let callIdx = 0;
      Math.random = () => {
        callIdx++;
        if (callIdx === 1) return 0.5; // sleep duration
        if (callIdx === 2) return 0.5; // skip rate limit check (> 0.067)
        return 0.05; // failure check (< 0.125)
      };
      const failResult = await sendToBroker(testBroker);

      Math.random = originalRandom;

      expect(successResult.success).toBe(true);
      expect(successResult.method).toBe('demo');
      expect(failResult.success).toBe(false);
      expect(failResult.error.code).toBe('RESEND_FAILED');
    }, 10000);
  });

  // ── batchSend tests ─────────────────────────────────────────────────────

  describe('batchSend', () => {
    const brokers = [
      { id: 'broker-a', name: 'Broker A', email: 'a@test.com', legalFramework: 'GDPR' },
      { id: 'broker-b', name: 'Broker B', email: 'b@test.com', legalFramework: 'GDPR' },
      { id: 'broker-c', name: 'Broker C', email: 'c@test.com', legalFramework: 'GDPR' },
    ];

    beforeEach(() => {
      mockGetBrokerStatusValue.mockReturnValue(STATUS.SELECTED);
    });

    it('Test 8: calls onProgress with { current, total, broker, sent, failed } after each broker', async () => {
      const onProgress = vi.fn();
      await batchSend(brokers, { delayMs: 0, onProgress });
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 1,
          total: 3,
          broker: brokers[0],
          sent: 1,
          failed: 0,
        })
      );
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          current: 3,
          total: 3,
          sent: 3,
          failed: 0,
        })
      );
    });

    it('Test 9: pauses on RATE_LIMITED response and calls onRateLimited callback', async () => {
      let callCount = 0;
      mockRelaySend.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            success: false,
            error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            retryAfter: 1,
          };
        }
        return {
          success: true,
          data: { emailId: 'e1', tempAddress: 'slug1234@erasurekit.uk' },
        };
      });

      const onRateLimited = vi.fn();
      const singleBroker = [brokers[0]];
      await batchSend(singleBroker, { delayMs: 0, onRateLimited });

      expect(onRateLimited).toHaveBeenCalledWith(
        expect.objectContaining({
          seconds: 1,
          broker: brokers[0],
        })
      );
    });

    it('Test 10: marks broker as FAILED on RESEND_FAILED or INVALID_PAYLOAD error', async () => {
      mockRelaySend.mockResolvedValue({
        success: false,
        error: { code: 'RESEND_FAILED', message: 'Email delivery failed' },
      });

      const singleBroker = [brokers[0]];
      await batchSend(singleBroker, { delayMs: 0 });

      expect(mockMarkBrokerFailed).toHaveBeenCalledWith(
        'broker-a',
        'RESEND_FAILED',
        'Email delivery failed'
      );
    });

    it('Test 11: respects AbortSignal and stops early', async () => {
      const controller = new AbortController();
      const onProgress = vi.fn();

      // Abort after first send
      mockRelaySend.mockImplementation(async () => {
        controller.abort();
        return { success: true, data: { emailId: 'e1' } };
      });

      await batchSend(brokers, { delayMs: 0, onProgress, signal: controller.signal });

      // Only 1 broker should have been processed before abort
      expect(onProgress).toHaveBeenCalledTimes(1);
    });

    it('Test 12: returns { sent, failed, total } summary', async () => {
      const result = await batchSend(brokers, { delayMs: 0 });
      expect(result).toEqual({ sent: 3, failed: 0, total: 3 });
    });

    it('includes FAILED brokers in send list for retry-all', async () => {
      mockGetBrokerStatusValue.mockImplementation((id) => {
        if (id === 'broker-b') return STATUS.FAILED;
        return STATUS.SELECTED;
      });

      const result = await batchSend(brokers, { delayMs: 0 });
      expect(result.total).toBe(3);
    });

    it('skips AWAITING brokers (already sent)', async () => {
      mockGetBrokerStatusValue.mockImplementation((id) => {
        if (id === 'broker-b') return STATUS.AWAITING;
        return STATUS.SELECTED;
      });

      const result = await batchSend(brokers, { delayMs: 0 });
      expect(result.total).toBe(2);
    });
  });

  // ── getUnsentCount tests ────────────────────────────────────────────────

  describe('getUnsentCount', () => {
    it('Test 13: counts SELECTED and FAILED brokers as unsent', () => {
      mockCampaign.value = {
        ...mockCampaign.value,
        brokers: { selected: ['a', 'b', 'c', 'd'] },
        statuses: {
          a: { status: STATUS.SELECTED },
          b: { status: STATUS.AWAITING },
          c: { status: STATUS.FAILED },
          d: { status: STATUS.NOT_SELECTED },
        },
      };
      expect(getUnsentCount()).toBe(3);
    });
  });

  // ── Deprecated function removal ────────────────────────────────────────

  describe('deprecated removal', () => {
    it('Test 14: buildMailtoUrl and MAILTO_LIMIT no longer exist', async () => {
      const mod = await import('./email-sender.js');
      expect(mod.buildMailtoUrl).toBeUndefined();
      expect(mod.MAILTO_LIMIT).toBeUndefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { relaySend, relayDeleteAddress, RELAY_URL } from './relay-client.js';

describe('relay-client', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('RELAY_URL', () => {
    it('is defined and points to the erasurekit API', () => {
      expect(RELAY_URL).toBe('https://api.erasurekit.uk');
    });
  });

  describe('relaySend', () => {
    const validPayload = {
      to: 'dpo@example.com',
      subject: 'GDPR Erasure Request',
      encryptedBody: 'base64-encrypted-body',
      wrappedKey: 'base64-wrapped-key',
      iv: 'base64-iv',
      tempAddress: 'a7k9x3mq',
      publicKey: '{"kty":"RSA"}',
    };

    it('with successful response returns { success: true, data: { emailId, tempAddress } }', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: { emailId: 'email-123', tempAddress: 'a7k9x3mq@erasurekit.uk' },
        }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relaySend(validPayload);
      expect(result).toEqual({
        success: true,
        data: { emailId: 'email-123', tempAddress: 'a7k9x3mq@erasurekit.uk' },
      });
    });

    it('with 400 response returns { success: false, error: { code: "INVALID_PAYLOAD", message } }', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'Invalid field "to": Must be a valid email address' },
        }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relaySend(validPayload);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_PAYLOAD');
      expect(result.error.message).toContain('Invalid field');
    });

    it('with 429 response returns { success: false, error: { code: "RATE_LIMITED" }, retryAfter: number }', async () => {
      const headers = new Headers();
      headers.set('Retry-After', '30');
      const mockResponse = {
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        }),
        headers,
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relaySend(validPayload);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RATE_LIMITED');
      expect(result.retryAfter).toBe(30);
    });

    it('with 429 response and missing Retry-After header defaults retryAfter to 60', async () => {
      const headers = new Headers();
      const mockResponse = {
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        }),
        headers,
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relaySend(validPayload);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RATE_LIMITED');
      expect(result.retryAfter).toBe(60);
    });

    it('with 502 response returns { success: false, error: { code: "RESEND_FAILED", message } }', async () => {
      const mockResponse = {
        ok: false,
        status: 502,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'RESEND_FAILED', message: 'Email delivery failed' },
        }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relaySend(validPayload);
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('RESEND_FAILED');
    });

    it('sends correct Content-Type header and JSON body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { emailId: 'e1', tempAddress: 'test@erasurekit.uk' } }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      await relaySend(validPayload);

      expect(global.fetch).toHaveBeenCalledWith(
        `${RELAY_URL}/send`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(validPayload),
        })
      );
    });

    it('with network error (fetch throws) propagates the error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      await expect(relaySend(validPayload)).rejects.toThrow('Network error');
    });
  });

  describe('relayDeleteAddress', () => {
    it('with successful response returns { success: true, data: { deleted: slug } }', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: { deleted: 'a7k9x3mq' },
        }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relayDeleteAddress('a7k9x3mq');
      expect(result).toEqual({
        success: true,
        data: { deleted: 'a7k9x3mq' },
      });
    });

    it('with 400 response returns error object', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'Slug must be 8 alphanumeric characters' },
        }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      const result = await relayDeleteAddress('bad');
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_PAYLOAD');
    });

    it('constructs URL with slug query parameter', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { deleted: 'a7k9x3mq' } }),
        headers: new Map(),
      };
      global.fetch.mockResolvedValue(mockResponse);

      await relayDeleteAddress('a7k9x3mq');

      expect(global.fetch).toHaveBeenCalledWith(
        `${RELAY_URL}/address?slug=a7k9x3mq`,
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });
});

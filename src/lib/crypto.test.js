import { describe, it, expect } from 'vitest';
import { generateCampaignKeyPair, encryptEmailBody, decryptEmailBody } from './crypto.js';

describe('generateCampaignKeyPair', () => {
  it('returns public and private JWK keys with RSA type', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
    expect(publicKeyJwk).toBeDefined();
    expect(privateKeyJwk).toBeDefined();
    expect(publicKeyJwk.kty).toBe('RSA');
    expect(privateKeyJwk.kty).toBe('RSA');
  });

  it('public key has encrypt key_ops (not decrypt)', async () => {
    const { publicKeyJwk } = await generateCampaignKeyPair();
    expect(publicKeyJwk.key_ops).toContain('encrypt');
    expect(publicKeyJwk.key_ops).not.toContain('decrypt');
  });

  it('private key has decrypt key_ops (not encrypt)', async () => {
    const { privateKeyJwk } = await generateCampaignKeyPair();
    expect(privateKeyJwk.key_ops).toContain('decrypt');
    expect(privateKeyJwk.key_ops).not.toContain('encrypt');
  });

  it('keys have RSA-OAEP-256 algorithm', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
    expect(publicKeyJwk.alg).toBe('RSA-OAEP-256');
    expect(privateKeyJwk.alg).toBe('RSA-OAEP-256');
  });
});

describe('encryptEmailBody', () => {
  it('returns encryptedBody, wrappedKey, iv as non-empty base64 strings', async () => {
    const { publicKeyJwk } = await generateCampaignKeyPair();
    const result = await encryptEmailBody('Hello GDPR', publicKeyJwk);
    expect(result.encryptedBody).toBeDefined();
    expect(result.wrappedKey).toBeDefined();
    expect(result.iv).toBeDefined();
    expect(typeof result.encryptedBody).toBe('string');
    expect(typeof result.wrappedKey).toBe('string');
    expect(typeof result.iv).toBe('string');
    expect(result.encryptedBody.length).toBeGreaterThan(0);
    expect(result.wrappedKey.length).toBeGreaterThan(0);
    expect(result.iv.length).toBeGreaterThan(0);
  });

  it('produces different ciphertext for the same plaintext (random IV and session key)', async () => {
    const { publicKeyJwk } = await generateCampaignKeyPair();
    const result1 = await encryptEmailBody('Same text', publicKeyJwk);
    const result2 = await encryptEmailBody('Same text', publicKeyJwk);
    // At least one of the fields should differ due to random IV and session key
    const differ = result1.encryptedBody !== result2.encryptedBody ||
                   result1.wrappedKey !== result2.wrappedKey ||
                   result1.iv !== result2.iv;
    expect(differ).toBe(true);
  });

  it('throws with invalid public key', async () => {
    await expect(
      encryptEmailBody('Test', { kty: 'RSA', invalid: true })
    ).rejects.toThrow();
  });
});

describe('decryptEmailBody', () => {
  it('round-trip: encrypt then decrypt recovers original text', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
    const plaintext = 'Hello GDPR';
    const encrypted = await encryptEmailBody(plaintext, publicKeyJwk);
    const decrypted = await decryptEmailBody(encrypted, privateKeyJwk);
    expect(decrypted).toBe(plaintext);
  });

  it('handles long text (2000+ chars)', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
    const longText = 'A'.repeat(2500) + ' - GDPR erasure request body with detailed legal references and identity information.';
    const encrypted = await encryptEmailBody(longText, publicKeyJwk);
    const decrypted = await decryptEmailBody(encrypted, privateKeyJwk);
    expect(decrypted).toBe(longText);
  });

  it('handles Unicode characters (European names with accents)', async () => {
    const { publicKeyJwk, privateKeyJwk } = await generateCampaignKeyPair();
    const unicodeText = 'Dear Data Controller, Please erase all data for: Muller, Francois, Papadopoulos, Bjornsson';
    const encrypted = await encryptEmailBody(unicodeText, publicKeyJwk);
    const decrypted = await decryptEmailBody(encrypted, privateKeyJwk);
    expect(decrypted).toBe(unicodeText);
  });

  it('fails with wrong private key', async () => {
    const keyPair1 = await generateCampaignKeyPair();
    const keyPair2 = await generateCampaignKeyPair();
    const encrypted = await encryptEmailBody('Secret message', keyPair1.publicKeyJwk);
    await expect(
      decryptEmailBody(encrypted, keyPair2.privateKeyJwk)
    ).rejects.toThrow();
  });
});

// ── E2E Encryption Module ────────────────────────────────────────────────────
//
// Browser-side hybrid encryption for ErasureKit campaigns.
// Per-campaign RSA-OAEP 2048-bit key pair + AES-256-GCM session keys.
// Uses the Web Crypto API exclusively -- no external crypto libraries.
//
// Flow:
//   1. generateCampaignKeyPair()  -> { publicKeyJwk, privateKeyJwk }
//   2. encryptEmailBody(text, publicKeyJwk) -> { encryptedBody, wrappedKey, iv }
//   3. decryptEmailBody({ encryptedBody, wrappedKey, iv }, privateKeyJwk) -> text
//
// References:
//   - D-11: Browser generates key pair per campaign, private key stored in campaign JSON
//   - D-12: Hybrid RSA-OAEP + AES-256-GCM encryption
//   - MDN SubtleCrypto: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto

// ── Configuration ────────────────────────────────────────────────────────────

const RSA_ALGORITHM = { name: 'RSA-OAEP', hash: 'SHA-256' };
const RSA_KEY_SIZE = 2048;
const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits, recommended for AES-GCM

// ── Base64 Helpers (internal) ────────────────────────────────────────────────

/**
 * Convert an ArrayBuffer to a base64 string.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a base64 string back to an ArrayBuffer.
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate an RSA-OAEP 2048-bit key pair for a campaign.
 * Both keys are exported as JWK for storage in the campaign JSON file.
 *
 * @returns {Promise<{ publicKeyJwk: JsonWebKey, privateKeyJwk: JsonWebKey }>}
 */
export async function generateCampaignKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: RSA_ALGORITHM.name,
      modulusLength: RSA_KEY_SIZE,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: RSA_ALGORITHM.hash,
    },
    true, // extractable -- required for JWK export (D-11)
    ['encrypt', 'decrypt']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

// ── Encryption ───────────────────────────────────────────────────────────────

/**
 * Encrypt an email body using hybrid RSA-OAEP + AES-256-GCM.
 *
 * 1. Import the campaign's RSA-OAEP public key from JWK
 * 2. Generate a random AES-256-GCM session key
 * 3. Generate a random 12-byte IV
 * 4. Encrypt the plaintext with AES-GCM
 * 5. Export the session key as raw bytes
 * 6. Wrap (encrypt) the session key with RSA-OAEP
 * 7. Return all three components as base64 strings
 *
 * @param {string} plaintext - The email body to encrypt
 * @param {JsonWebKey} publicKeyJwk - The campaign's RSA-OAEP public key (JWK)
 * @returns {Promise<{ encryptedBody: string, wrappedKey: string, iv: string }>}
 */
export async function encryptEmailBody(plaintext, publicKeyJwk) {
  // 1. Import RSA-OAEP public key
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicKeyJwk,
    { name: RSA_ALGORITHM.name, hash: RSA_ALGORITHM.hash },
    false,
    ['encrypt']
  );

  // 2. Generate random AES-256-GCM session key
  const sessionKey = await crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: AES_KEY_LENGTH },
    true, // extractable -- needed to export and wrap
    ['encrypt', 'decrypt']
  );

  // 3. Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 4. Encrypt plaintext with AES-GCM
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    sessionKey,
    encoder.encode(plaintext)
  );

  // 5. Export session key as raw bytes
  const rawSessionKey = await crypto.subtle.exportKey('raw', sessionKey);

  // 6. Wrap (encrypt) session key with RSA-OAEP public key
  const wrappedKey = await crypto.subtle.encrypt(
    { name: RSA_ALGORITHM.name },
    publicKey,
    rawSessionKey
  );

  // 7. Return base64-encoded components for JSON transport
  return {
    encryptedBody: arrayBufferToBase64(ciphertext),
    wrappedKey: arrayBufferToBase64(wrappedKey),
    iv: arrayBufferToBase64(iv),
  };
}

// ── Decryption ───────────────────────────────────────────────────────────────

/**
 * Decrypt an email body using the campaign's private key.
 *
 * 1. Import the RSA-OAEP private key from JWK
 * 2. Base64-decode all three inputs
 * 3. Unwrap (decrypt) the session key with RSA-OAEP
 * 4. Import the raw session key as AES-GCM
 * 5. Decrypt the body with AES-GCM
 * 6. Decode and return plaintext
 *
 * @param {{ encryptedBody: string, wrappedKey: string, iv: string }} encrypted
 * @param {JsonWebKey} privateKeyJwk - The campaign's RSA-OAEP private key (JWK)
 * @returns {Promise<string>} The decrypted plaintext
 */
export async function decryptEmailBody({ encryptedBody, wrappedKey, iv }, privateKeyJwk) {
  // 1. Import RSA-OAEP private key
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    { name: RSA_ALGORITHM.name, hash: RSA_ALGORITHM.hash },
    false,
    ['decrypt']
  );

  // 2. Base64-decode inputs
  const ciphertextBytes = base64ToArrayBuffer(encryptedBody);
  const wrappedKeyBytes = base64ToArrayBuffer(wrappedKey);
  const ivBytes = new Uint8Array(base64ToArrayBuffer(iv));

  // 3. Unwrap (decrypt) the session key with RSA-OAEP
  const rawSessionKey = await crypto.subtle.decrypt(
    { name: RSA_ALGORITHM.name },
    privateKey,
    wrappedKeyBytes
  );

  // 4. Import raw session key as AES-GCM
  const sessionKey = await crypto.subtle.importKey(
    'raw',
    rawSessionKey,
    { name: AES_ALGORITHM },
    false,
    ['decrypt']
  );

  // 5. Decrypt body with AES-GCM
  const plaintext = await crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: ivBytes },
    sessionKey,
    ciphertextBytes
  );

  // 6. Decode and return
  return new TextDecoder().decode(plaintext);
}

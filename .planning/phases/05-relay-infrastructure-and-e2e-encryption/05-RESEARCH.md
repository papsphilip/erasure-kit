# Phase 5: Relay Infrastructure and E2E Encryption - Research

**Researched:** 2026-04-03
**Domain:** Cloudflare Workers, Resend API, Web Crypto API (hybrid encryption), Cloudflare KV
**Confidence:** HIGH

## Summary

Phase 5 deploys a Cloudflare Worker at `api.erasurekit.uk` that acts as a stateless email relay. The browser encrypts the email body with a per-campaign RSA-OAEP + AES-256-GCM hybrid scheme, sends the encrypted payload to the Worker, and the Worker calls the Resend API to deliver the email from a temporary `@erasurekit.uk` address. The Worker never sees plaintext body content -- it only accesses recipient, subject, and sender address (required for the Resend API call). KV stores a mapping from temp address to public encryption key for future reply routing (Phase 7).

All four technologies are mature, free-tier compatible, and well-documented. Cloudflare Workers natively support the Web Crypto API including RSA-OAEP and AES-GCM. Resend's REST API is trivial to call via `fetch()` from a Worker -- no SDK required. The main risk areas are (1) getting DNS/domain verification right for Resend before emails can be sent, (2) the Resend rate limit of 2 requests/second and 100 emails/day on free tier, and (3) ensuring the hybrid encryption format is portable between browser and campaign JSON file.

**Primary recommendation:** Use direct `fetch()` to call Resend's REST API (no SDK dependency). Use `wrangler.jsonc` for Worker config. Implement rate limiting via KV-based IP counters with 60-second TTL. Structure the Worker as a separate `worker/` directory at the project root with its own `package.json` and `wrangler.jsonc`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single POST /send endpoint. Additional endpoints (health, quota, replies) added in later phases as needed.
- **D-02:** CORS policy: Access-Control-Allow-Origin: * -- required for file://, localhost, and portable HTML use cases.
- **D-03:** Structured JSON responses: always return `{ success: bool, error?: { code: string, message: string }, data?: {...} }`. Error codes include RATE_LIMITED, RESEND_FAILED, INVALID_PAYLOAD, etc.
- **D-04:** Worker also exposes DELETE /address endpoint for campaign cleanup (temp address deletion from KV).
- **D-05:** Browser generates the temp address slug -- 8 random alphanumeric chars via crypto.getRandomValues (e.g. a7k9x3mq@erasurekit.uk). No server round-trip to claim an address.
- **D-06:** Temp address stored in campaign JSON file (campaign.tempEmail field). Worker KV maps address -> public encryption key for reply routing.
- **D-07:** User-controlled deletion: temp address is deleted when user clicks "End Campaign" or when all brokers are resolved. Phase 5 provides the DELETE /address Worker endpoint; Phase 6 adds the frontend button.
- **D-08:** Safety-net TTL on KV entries for abandoned campaigns (e.g. 90 days). Prevents KV bloat from campaigns that are never explicitly ended.
- **D-09:** Multiple campaigns allowed per IP -- no restriction.
- **D-10:** Encrypt email body only. Worker sees in plaintext: recipient email, subject line, sender temp address (all needed to call Resend API). Worker CANNOT see: email body (contains user identity info, legal text).
- **D-11:** Browser generates a key pair per campaign via Web Crypto API. Private key exported (JWK) and stored in the campaign JSON file for portability. Public key sent to Worker and stored in KV alongside the temp address.
- **D-12:** Hybrid encryption pattern: asymmetric key wraps a random symmetric session key, symmetric key encrypts the body. Specific algorithm at Claude's discretion (likely RSA-OAEP 2048-bit + AES-256-GCM).
- **D-13:** Resend API key stored as Cloudflare Worker environment variable (wrangler secret). Never exposed to browser.
- **D-14:** Reply-To header set to the same temp address from day 1 (From: a7k9x3mq@erasurekit.uk, Reply-To: a7k9x3mq@erasurekit.uk). Ensures broker replies route correctly when Phase 7 adds Email Routing.
- **D-15:** Worker handles Resend failures by returning immediate structured errors (RATE_LIMITED with retry-after hint, or RESEND_FAILED with details). Frontend is responsible for retry logic. Worker stays stateless.
- **D-16:** Worker deployed globally (Cloudflare default routing). Resend configured in eu-west-1 region for GDPR data residency. Worker is just a proxy -- actual email processing stays in EU.

### Claude's Discretion
- Auth model: Claude decides (recommended: open + IP rate limiting via Cloudflare, simplest for no-account portable app)
- Encryption algorithm: Claude picks best fit for browser compatibility, key size, and simplicity (likely RSA-OAEP + AES-GCM)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RELAY-01 | Cloudflare Worker deployed at api.erasurekit.uk accepts encrypted email payloads and sends them via Resend API from generated @erasurekit.uk addresses | Worker project structure, Resend API integration, custom domain routing, CORS handling |
| RELAY-02 | Each campaign gets a unique temporary sender address (e.g. a7k9x@erasurekit.uk) that persists across the campaign session | KV storage for temp address mapping, TTL/expiration for safety-net cleanup, browser-side slug generation |
| RELAY-03 | Worker returns structured JSON responses (success/failure per broker, quota remaining, error details) for frontend consumption | Resend API response format, error code mapping, structured response pattern |
| E2EE-01 | User's browser generates a Web Crypto API key pair; only the browser holds the private decryption key | RSA-OAEP key generation, JWK export/import, extractable parameter behavior |
| E2EE-02 | All email content (template body, identity data) is encrypted before leaving the browser -- the Worker and domain owner cannot decrypt it | Hybrid RSA-OAEP + AES-256-GCM encryption, wrapKey pattern, Worker receives ciphertext only |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| wrangler | 4.80.0 | Cloudflare Worker CLI (dev, deploy, secrets) | Official Cloudflare toolchain. Mandatory for Worker development. |
| None (direct fetch) | -- | Resend API calls | Resend's REST API is simple enough that `fetch()` is cleaner than adding a 60KB SDK. Official CF tutorial uses SDK, but direct fetch avoids Node.js compatibility shims. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/vitest-pool-workers | 0.14.1 | Unit testing Workers in Vitest | Testing Worker handler logic with Miniflare-powered environment |
| vitest | 4.1.2 | Test runner (already in project) | Run Worker tests alongside existing frontend tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct `fetch()` for Resend | `resend` npm SDK (v6.10.0) | SDK adds ~60KB bundle and Node.js compatibility concerns in Workers runtime. Direct fetch is 20 lines of code. |
| `wrangler.jsonc` config | `wrangler.toml` config | TOML still works but Cloudflare recommends JSON for new projects (better schema validation, editor autocomplete). |
| KV-based rate limiting | Cloudflare Rate Limiting binding | Rate Limiting binding requires paid plan. KV-based counter with TTL works on free tier with some eventual consistency tradeoff. |
| RSA-OAEP 2048-bit | RSA-OAEP 4096-bit | 4096-bit is slower to generate (~2-5s vs ~0.5s in browser) and unnecessary for this threat model. 2048-bit RSA is NIST-approved through 2030. |

**Installation (Worker directory):**
```bash
cd worker
npm init -y
npm install --save-dev wrangler @cloudflare/vitest-pool-workers vitest
```

**Version verification:** wrangler 4.80.0 (verified via `npm view wrangler version` 2026-04-03). @cloudflare/vitest-pool-workers 0.14.1 (verified same date).

## Architecture Patterns

### Recommended Project Structure
```
erasure-kit/
  src/                          # Existing Preact frontend
    lib/
      crypto.js                 # NEW: Web Crypto key gen, encrypt/decrypt helpers
      campaign.js               # MODIFIED: v3 schema with encryption field
      email-sender.js           # NOT MODIFIED (Phase 6 changes this)
  worker/                       # NEW: Cloudflare Worker (separate project)
    src/
      index.js                  # Worker entry: fetch handler with route dispatch
      routes/
        send.js                 # POST /send handler
        address.js              # DELETE /address handler
      lib/
        resend.js               # Resend API client (direct fetch)
        cors.js                 # CORS headers helper
        validate.js             # Request payload validation
        rate-limit.js           # KV-based IP rate limiter
    wrangler.jsonc              # Worker configuration
    package.json                # Worker dependencies (wrangler, vitest)
    .dev.vars                   # Local secrets (gitignored)
    vitest.config.js            # Worker test config
    tests/
      send.test.js              # /send endpoint tests
      address.test.js           # /address endpoint tests
      rate-limit.test.js        # Rate limiter tests
  public/
    brokers.json                # Existing broker database
  package.json                  # Existing frontend package.json
```

### Pattern 1: Stateless Worker with Route Dispatch

**What:** The Worker handles all routes in a single `fetch()` entry point, dispatching to route-specific handlers based on URL path and HTTP method.

**When to use:** Always -- this is the standard CF Worker pattern for multi-endpoint APIs.

**Example:**
```javascript
// Source: Cloudflare Workers docs
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Route dispatch
    if (url.pathname === '/send' && request.method === 'POST') {
      return handleSend(request, env);
    }
    if (url.pathname === '/address' && request.method === 'DELETE') {
      return handleDeleteAddress(request, env);
    }

    return jsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown endpoint' } }, 404);
  },
};
```

### Pattern 2: Hybrid Encryption (RSA-OAEP + AES-256-GCM)

**What:** Browser generates a per-session AES-256-GCM key, encrypts the email body with it, then encrypts the AES key with the campaign's RSA-OAEP public key. Both ciphertexts travel to the Worker. The Worker passes them through to the email body as-is (encrypted blob). Only the browser with the private key can decrypt.

**When to use:** Every email send operation.

**Critical detail:** RSA-OAEP with SHA-256 and 2048-bit key can encrypt at most 190 bytes. An AES-256 key is 32 bytes, well within this limit. The body itself is encrypted with AES-GCM which has no practical size limit.

**Example (browser-side encryption):**
```javascript
// Source: MDN Web Crypto API docs
async function encryptEmailBody(plaintext, publicKeyJwk) {
  // 1. Import the campaign's RSA-OAEP public key
  const publicKey = await crypto.subtle.importKey(
    'jwk', publicKeyJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['encrypt']
  );

  // 2. Generate a random AES-256-GCM session key
  const sessionKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, ['encrypt', 'decrypt']
  );

  // 3. Encrypt the body with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    encoder.encode(plaintext)
  );

  // 4. Export and encrypt the session key with RSA-OAEP
  const rawSessionKey = await crypto.subtle.exportKey('raw', sessionKey);
  const wrappedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawSessionKey
  );

  // 5. Return base64-encoded components for JSON transport
  return {
    encryptedBody: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    wrappedKey: btoa(String.fromCharCode(...new Uint8Array(wrappedKey))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}
```

### Pattern 3: KV-Based Rate Limiting

**What:** Use KV with TTL to implement a simple sliding-window rate limiter per IP. Store a counter key like `rate:${ip}` with a 60-second TTL. Increment on each request.

**When to use:** Every incoming request to protect against abuse.

**Limitations:** KV is eventually consistent, so counters may be slightly off under high concurrency. Acceptable for this use case -- we want to prevent bulk abuse, not enforce precise per-second limits.

**Example:**
```javascript
// Source: Cloudflare KV docs (adapted)
async function checkRateLimit(env, ip, limit = 10, windowSec = 60) {
  const key = `rate:${ip}`;
  const current = parseInt(await env.KV.get(key)) || 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0, retryAfter: windowSec };
  }

  await env.KV.put(key, String(current + 1), { expirationTtl: windowSec });
  return { allowed: true, remaining: limit - current - 1 };
}
```

### Pattern 4: Structured JSON Response

**What:** Every Worker response follows a consistent envelope format per D-03.

**Example:**
```javascript
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...headers,
    },
  });
}

// Success
jsonResponse({ success: true, data: { emailId: 'abc-123', tempAddress: 'a7k9x3mq@erasurekit.uk' } });

// Error
jsonResponse({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }, 429, { 'Retry-After': '60' });
```

### Anti-Patterns to Avoid

- **Using the Resend SDK in a Worker:** Adds unnecessary bundle size and potential Node.js compatibility issues. Direct `fetch()` is simpler and more reliable.
- **Storing private keys in KV:** Only the public key goes to KV. The private key stays in the browser's campaign JSON file. Never transmit the private key.
- **Encrypting subject/recipient:** D-10 explicitly says the Worker needs these in plaintext to call the Resend API. Only the body is encrypted.
- **Using `wrangler dev --remote` for testing:** Local dev with Miniflare is faster and avoids hitting real Resend quota. Use `.dev.vars` for the API key.
- **Synchronous Worker responses waiting for retries:** Worker is stateless (D-15). Return errors immediately; frontend handles retries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CORS handling | Custom per-route CORS logic | Centralized CORS helper (5 lines) | CORS preflight + response headers must be consistent across all endpoints |
| Rate limiting | Complex token bucket / sliding window | KV-based simple counter with TTL | Eventual consistency is fine for abuse prevention; keeps code under 20 lines |
| Crypto operations | Raw ArrayBuffer manipulation | Web Crypto API `encrypt`/`decrypt`/`generateKey`/`exportKey` | Browser and Workers runtime both implement the same W3C spec; no polyfill needed |
| Email sending | Raw TCP/SMTP | Resend REST API | Deliverability, SPF/DKIM/DMARC handled by Resend |
| Base64 encoding | Manual byte conversion | `btoa()`/`atob()` (browser) or `btoa()`/`atob()` (Workers) | Native, fast, no library needed |
| UUID generation | Custom random string | `crypto.getRandomValues()` + alphanumeric filter | Browser-native, cryptographically random |

**Key insight:** This phase has zero dependencies beyond the platform APIs. Cloudflare Workers, Resend, and Web Crypto are all standard platform services -- no npm libraries are needed in the Worker itself (only `wrangler` as a dev dependency for tooling).

## Common Pitfalls

### Pitfall 1: Resend Domain Not Verified Before Testing
**What goes wrong:** Resend returns 403 or sends from `onboarding@resend.dev` instead of `@erasurekit.uk`.
**Why it happens:** DNS records (SPF, DKIM) must be added to Cloudflare DNS and verified by Resend before the domain can send. Verification can take minutes to hours.
**How to avoid:** Add DNS records as the very first task. Use `onboarding@resend.dev` sandbox for initial development, then switch to the real domain once verified.
**Warning signs:** Resend dashboard shows domain status as "pending" or "not_started".

### Pitfall 2: Missing User-Agent Header on Resend API Calls
**What goes wrong:** Resend returns 403 with error code 1010 despite valid API key.
**Why it happens:** Resend requires a `User-Agent` header on all API requests. Direct `fetch()` in Workers may not set one by default.
**How to avoid:** Always include `'User-Agent': 'ErasureKit-Worker/1.0'` in fetch headers.
**Warning signs:** 403 errors that look like auth failures but API key is correct.

### Pitfall 3: Resend Rate Limit (2 req/sec, 100/day)
**What goes wrong:** Burst sending of 100+ broker emails hits the 2 requests/second API rate limit, causing 429 responses.
**Why it happens:** Free tier limits: 2 requests/second per team, 100 emails/day, 3,000/month.
**How to avoid:** Phase 5 Worker should return RATE_LIMITED errors with retry-after hints. Phase 6 frontend adds delay between sends. Phase 8 adds full batching/scheduling.
**Warning signs:** Resend returns 429 status codes with rate limit headers.

### Pitfall 4: KV Write Rate Limit (1 write/sec per key)
**What goes wrong:** Rate limiter KV counter writes fail with 429 if the same IP sends requests faster than 1/second to the same key.
**Why it happens:** KV has a hard limit of 1 write per second to the same key.
**How to avoid:** Use IP + minute-bucket as key (e.g., `rate:1.2.3.4:2026040315`) so consecutive requests hit different keys. Or accept that rate limiting is best-effort.
**Warning signs:** KV put operations return errors during load testing.

### Pitfall 5: Forgetting CORS Preflight (OPTIONS)
**What goes wrong:** Browser sends OPTIONS preflight before POST, Worker returns 404, actual POST never fires.
**Why it happens:** Cross-origin POST with `Content-Type: application/json` triggers CORS preflight. Worker must handle OPTIONS explicitly.
**How to avoid:** Add OPTIONS handler that returns 204 with CORS headers before any route matching.
**Warning signs:** Browser console shows "CORS error" on fetch, network tab shows OPTIONS request with non-200 response.

### Pitfall 6: RSA Key Generation Blocking the UI
**What goes wrong:** RSA-2048 key generation takes 200-800ms, during which the UI freezes.
**Why it happens:** `crypto.subtle.generateKey()` for RSA is CPU-intensive. In the main thread, it blocks rendering.
**How to avoid:** Generate keys asynchronously (it already returns a Promise) and show a loading indicator. Consider generating at campaign creation time, not at send time.
**Warning signs:** Noticeable pause when starting a new campaign.

### Pitfall 7: Campaign File Private Key Exposure
**What goes wrong:** User shares their campaign JSON file and accidentally exposes their private encryption key.
**Why it happens:** Private key is stored in the campaign file for portability (D-11). The file is designed to be saved/loaded locally.
**How to avoid:** This is by design -- the campaign file is the user's private data. Add a warning in the About/Privacy page that campaign files contain encryption keys. Phase 10 privacy transparency page should cover this.
**Warning signs:** Not applicable during development -- this is a documentation/UX concern.

### Pitfall 8: Web Crypto Context Requirement (HTTPS/Secure Context)
**What goes wrong:** `crypto.subtle` is `undefined`, all encryption operations fail.
**Why it happens:** Web Crypto API requires a secure context (HTTPS, localhost, or file://). Development via `file://` protocol IS a secure context in modern browsers.
**How to avoid:** Development modes all satisfy this: `file://` (direct open), `localhost` (Vite dev server), and production HTTPS. No action needed, but worth verifying during testing.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'generateKey')`.

## Code Examples

Verified patterns from official sources:

### Resend API Call from Worker (Direct Fetch)
```javascript
// Source: https://resend.com/docs/api-reference/emails/send-email
// + https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/
async function sendEmail(env, { from, to, subject, html, replyTo }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'User-Agent': 'ErasureKit-Worker/1.0',
    },
    body: JSON.stringify({ from, to: [to], subject, html, reply_to: replyTo }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { success: false, statusCode: response.status, error: data };
  }

  return { success: true, emailId: data.id };
}
```

### KV Operations for Temp Address
```javascript
// Source: https://developers.cloudflare.com/kv/api/write-key-value-pairs/
// Store temp address -> public key mapping with 90-day TTL
async function registerTempAddress(env, slug, publicKeyJwk) {
  const key = `addr:${slug}`;
  const value = JSON.stringify({
    publicKey: publicKeyJwk,
    createdAt: new Date().toISOString(),
  });
  // D-08: 90-day safety-net TTL (7,776,000 seconds)
  await env.KV.put(key, value, { expirationTtl: 7776000 });
}

// Delete temp address (D-07: user-controlled cleanup)
async function deleteTempAddress(env, slug) {
  const key = `addr:${slug}`;
  await env.KV.delete(key);
}

// Check if temp address exists (for reply routing - Phase 7)
async function getTempAddressData(env, slug) {
  const key = `addr:${slug}`;
  const value = await env.KV.get(key, { type: 'json' });
  return value; // null if not found or expired
}
```

### RSA-OAEP Key Pair Generation (Browser)
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey
async function generateCampaignKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // extractable (needed for JWK export)
    ['encrypt', 'decrypt']
  );

  // Export both keys as JWK for storage in campaign file
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}
```

### Wrangler Configuration (wrangler.jsonc)
```jsonc
// Source: https://developers.cloudflare.com/workers/wrangler/configuration/
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "erasurekit-relay",
  "main": "src/index.js",
  "compatibility_date": "2026-04-03",
  "routes": [
    {
      "pattern": "api.erasurekit.uk",
      "custom_domain": true
    }
  ],
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "<namespace-id>"
    }
  ],
  "secrets": {
    "required": ["RESEND_API_KEY"]
  }
}
```

### Browser-Side Temp Address Generation (D-05)
```javascript
// 8 random alphanumeric chars via crypto.getRandomValues
function generateTempSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const array = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}
// Returns e.g. "a7k9x3mq" -> full address: "a7k9x3mq@erasurekit.uk"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `wrangler.toml` only | `wrangler.jsonc` recommended | Wrangler v3.91.0 (2025) | Better schema validation, editor autocomplete |
| Miniflare v2 (separate install) | Miniflare v3 built into Wrangler | Wrangler v3+ (2023) | `wrangler dev` is fully local by default, ~90% adoption |
| Remote dev by default | Local-first dev (Miniflare-powered) | Wrangler v3+ (2023) | 10x faster startup, 60x faster reload |
| Resend SDK required | Direct fetch viable | Always (REST API) | No SDK dependency in Worker, smaller bundle |
| Cloudflare Email Service | Still in private beta (Sep 2025) | N/A | Not usable yet; stick with Resend for sending, Email Routing for receiving |

**Deprecated/outdated:**
- Miniflare v2: Deprecated, use v3 (built into Wrangler)
- `wrangler.toml`: Still works but not recommended for new projects
- Cloudflare Email Service: Private beta, not generally available -- do not plan around it

## Open Questions

1. **Resend domain verification timing**
   - What we know: DNS records need SPF + DKIM + optional DMARC. Verification can take minutes to hours.
   - What's unclear: Whether the erasurekit.uk domain has already been added to Resend and DNS records configured.
   - Recommendation: Make DNS setup + Resend verification the very first task. Use sandbox domain for initial development.

2. **KV namespace creation**
   - What we know: KV namespace must exist before Worker can bind to it. Can be auto-provisioned by Wrangler.
   - What's unclear: Whether the Cloudflare account already has any KV namespaces.
   - Recommendation: Use Wrangler auto-provisioning (omit `id` in config, Wrangler creates on deploy).

3. **Collision risk for 8-char temp slugs**
   - What we know: 36^8 = ~2.8 trillion possible slugs. With 1,000 active campaigns, collision probability is negligible.
   - What's unclear: Nothing -- the math is solid.
   - Recommendation: No collision check needed. If paranoia warrants it, the Worker could check KV before first use, but it's unnecessary.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Wrangler CLI | Yes | v24.12.0 | -- |
| npm | Package installation | Yes | 9.2.0 | -- |
| wrangler | Worker dev/deploy | No (not global) | -- | Install as devDependency in worker/ |
| Cloudflare account | Worker + KV + DNS | Assumed yes | -- | Must verify -- blocks everything |
| Resend account | Email sending | Assumed yes | -- | Must verify -- blocks email delivery |
| erasurekit.uk DNS | Custom domain | Assumed yes | -- | Cloudflare Registrar (already owned per PROJECT.md) |
| Vitest | Worker testing | Yes (project-level) | 4.1.2 | -- |

**Missing dependencies with no fallback:**
- Cloudflare account access and Resend account setup are prerequisites that must be verified before execution begins.

**Missing dependencies with fallback:**
- Wrangler is not globally installed but will be installed as a devDependency in the `worker/` directory.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + @cloudflare/vitest-pool-workers 0.14.1 |
| Config file | `worker/vitest.config.js` (Wave 0 -- does not exist yet) |
| Quick run command | `cd worker && npx vitest run` |
| Full suite command | `cd worker && npx vitest run && cd .. && npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RELAY-01 | Worker accepts POST /send with encrypted payload and sends via Resend | integration | `cd worker && npx vitest run tests/send.test.js -t "sends email"` | Wave 0 |
| RELAY-02 | KV stores temp address with public key, 90-day TTL | unit | `cd worker && npx vitest run tests/address.test.js -t "register"` | Wave 0 |
| RELAY-03 | Worker returns structured JSON responses for success and error cases | unit | `cd worker && npx vitest run tests/send.test.js -t "response format"` | Wave 0 |
| E2EE-01 | Browser generates RSA-OAEP key pair and exports as JWK | unit | `npx vitest run src/lib/crypto.test.js -t "key generation"` | Wave 0 |
| E2EE-02 | Email body encrypts with hybrid RSA-OAEP + AES-GCM, Worker cannot decrypt | unit | `npx vitest run src/lib/crypto.test.js -t "encrypt"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd worker && npx vitest run` (Worker tests) or `npx vitest run` (frontend tests)
- **Per wave merge:** Both Worker and frontend test suites
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `worker/vitest.config.js` -- Vitest config with @cloudflare/vitest-pool-workers
- [ ] `worker/tests/send.test.js` -- POST /send handler tests (success, validation, Resend errors)
- [ ] `worker/tests/address.test.js` -- DELETE /address and KV registration tests
- [ ] `worker/tests/rate-limit.test.js` -- Rate limiter unit tests
- [ ] `src/lib/crypto.test.js` -- Key generation, encrypt, decrypt round-trip tests
- [ ] `src/lib/crypto.js` -- The crypto module itself (browser-side)
- [ ] `worker/package.json` -- Worker project manifest with wrangler + vitest deps
- [ ] `.gitignore` update -- Add `.dev.vars`, `.wrangler/` entries

## Project Constraints (from CLAUDE.md)

From the project CLAUDE.md and Virgo global CLAUDE.md:

- **GSD workflow enforcement:** All work goes through GSD commands. No direct edits outside GSD.
- **Security/PII:** Never commit API keys, secrets, or real personal data. Use env vars for all secrets.
- **File organization:** No loose files in the monorepo root. Screenshots go to `screenshots/`.
- **Dynamic over hardcoded:** API URLs, rate limits, TTL values should be configurable constants at module top, not inline magic numbers.
- **Python isolation:** Not applicable (no Python in this phase).
- **All-Opus agents:** Model overrides already configured in `.planning/config.json`.
- **Vitest for testing:** Project already uses Vitest; Worker tests should also use Vitest via @cloudflare/vitest-pool-workers.

## Sources

### Primary (HIGH confidence)
- [Cloudflare Workers Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) -- config format, routes, secrets
- [Cloudflare Workers KV Bindings](https://developers.cloudflare.com/kv/concepts/kv-bindings/) -- binding setup, local dev
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) -- secret management, .dev.vars
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) -- free tier: 100K req/day, 10ms CPU, 128MB RAM
- [Cloudflare KV Limits](https://developers.cloudflare.com/kv/platform/limits/) -- free tier: 100K reads/day, 1K writes/day, 1GB storage
- [Cloudflare Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) -- api.erasurekit.uk setup
- [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) -- paid-only binding, KV alternative
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) -- RSA-OAEP + AES-GCM confirmed supported
- [Cloudflare Email Routing Workers](https://developers.cloudflare.com/email-routing/email-workers/) -- Phase 7 compatibility: receive email in Worker
- [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email) -- endpoint, params, response format
- [Resend Domain Management](https://resend.com/docs/dashboard/domains/introduction) -- SPF, DKIM, DMARC verification
- [Cloudflare + Resend Tutorial](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/) -- official integration tutorial
- [MDN SubtleCrypto.generateKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey) -- RSA-OAEP + AES-GCM params
- [MDN SubtleCrypto.wrapKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/wrapKey) -- key wrapping pattern
- [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) -- overview, secure context req
- [W3C Web Cryptography Level 2](https://www.w3.org/TR/webcrypto-2/) -- formal spec

### Secondary (MEDIUM confidence)
- [Cloudflare Workers Development & Testing](https://developers.cloudflare.com/workers/development-testing/) -- Miniflare v3, local-first dev
- [Resend Cloudflare Workers Example (GitHub)](https://github.com/resend/resend-cloudflare-workers-example) -- official example repo
- [Web Crypto Examples (GitHub)](https://github.com/diafygi/webcrypto-examples) -- community examples, comprehensive
- [RSA-OAEP max plaintext calculation](https://github.com/java-crypto/cross_platform_crypto/blob/main/docs/rsa_encryption_oaep_sha256_string.md) -- 190 bytes for 2048-bit + SHA-256

### Tertiary (LOW confidence)
- None -- all findings verified against official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All technologies are official Cloudflare/Resend platform services with comprehensive documentation. No third-party libraries needed.
- Architecture: HIGH -- Worker project structure follows official Cloudflare templates. Encryption pattern follows W3C Web Crypto spec.
- Pitfalls: HIGH -- Rate limits, CORS, domain verification are well-documented. RSA plaintext size limit is mathematically derived.

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable platform services, unlikely to change)

# Architecture Patterns

**Domain:** Relay-based email sending for GDPR erasure automation (v2.0 milestone)
**Researched:** 2026-04-01
**Supersedes:** v1.0 architecture (mail.tm + mailto: strategy, now replaced by relay)

## Executive Summary

v2.0 replaces the mailto:-based sending (which exposed the user's real email) and the mail.tm-based inbox monitoring (which relied on a third-party temp email service) with a **unified Cloudflare relay architecture**. A single Cloudflare Worker handles both outbound sending (via Resend API) and inbound reply processing (via Cloudflare Email Routing). Every user gets a random temporary address like `a7k9x@erasurekit.uk`. All emails are end-to-end encrypted so the domain owner cannot read user emails.

The frontend remains a portable Preact + HTM single-file app. The Worker is the only server-side component. Cloudflare KV provides the storage layer between the Worker (which writes) and the frontend (which polls). The Web Crypto API (available in both browsers and Cloudflare Workers) provides the cryptographic primitives for E2E encryption.

**Overall confidence: HIGH** -- All components are well-documented, production-stable Cloudflare services. The Resend API and Cloudflare Email Routing are both verified to work with Workers. The Web Crypto API is a W3C standard available in all target environments.

---

## v1.0 to v2.0 Architecture Delta

### What Changes

| Component | v1.0 | v2.0 | Why |
|-----------|------|------|-----|
| **Email sending** | mailto: links (user's email client) | Cloudflare Worker + Resend API | True automation, user's real email never exposed |
| **Reply monitoring** | mail.tm temp inbox (browser polls) | Cloudflare Email Routing catch-all | No dependency on third-party temp email service |
| **Temp email** | mail.tm API creates account | Worker assigns random `@erasurekit.uk` alias | One domain, infinite aliases via catch-all |
| **State sync** | 100% client-side (localStorage + file) | Client-side + Cloudflare KV for relay state | Worker needs persistent state for async replies |
| **Encryption** | Not needed (no server) | E2E encryption (user holds private key) | Domain owner must not be able to read emails |
| **Infrastructure cost** | $0 (free APIs) | ~$5.30/year (domain only) | All Cloudflare/Resend services on free tiers |

### What Stays the Same

| Component | Unchanged |
|-----------|-----------|
| **Frontend framework** | Preact + HTM + Signals |
| **Build system** | Vite + vite-plugin-singlefile |
| **Local persistence** | localStorage auto-save + browser-fs-access file save/load |
| **Campaign state signal** | `campaign.js` signal-based state management |
| **Broker database** | Separate `brokers.json`, community-editable |
| **Template engine** | GDPR/UK-GDPR/CCPA template generation |
| **Status tracker** | Per-broker lifecycle with 30-day deadline |

---

## Recommended Architecture

### System Component Diagram

```
+-----------------------------------------------------------------------+
|                     ErasureKit Frontend (Browser)                      |
|                                                                        |
|  +------------------+ +------------------+ +------------------------+ |
|  |  Identity Form   | | Broker Manager   | |  Campaign Dashboard    | |
|  |  (existing)      | | (existing)       | |  (existing + new       | |
|  |                  | |                  | |   reply monitoring)    | |
|  +--------+---------+ +--------+---------+ +----------+-------------+ |
|           |                    |                       |               |
|  +--------v--------------------v-----------------------v-------------+ |
|  |                        Core Engine                                | |
|  |                                                                    | |
|  | +----------------+ +-----------------+ +------------------------+ | |
|  | | Template Engine | | Relay Client    | | Crypto Module          | | |
|  | | (existing)     | | (NEW)           | | (NEW)                  | | |
|  | |                | | - register()    | | - generateKeyPair()    | | |
|  | |                | | - sendBatch()   | | - encrypt(pubKey,data) | | |
|  | |                | | - pollReplies() | | - decrypt(privKey,data)| | |
|  | |                | | - getStatus()   | | - exportKey()/import() | | |
|  | +--------+-------+ +--------+--------+ +----------+-------------+ | |
|  |          |                  |                      |               | |
|  | +--------v------------------v----------------------v-------------+ | |
|  | |                   Campaign State (Signals)                      | | |
|  | |  campaign.js (existing) + relay state extension                 | | |
|  | +----------------------------+------------------------------------+ | |
|  +-------------------------------------------------------------------+ |
|                                  |                                      |
|              [HTTPS fetch()]     |                                      |
+----------------------------------v--------------------------------------+
                                   |
                    +--------------v--------------+
                    |    Cloudflare Worker         |
                    |    (relay.erasurekit.uk)      |
                    |                              |
                    |  POST /register              |
                    |  POST /send                  |
                    |  GET  /replies/:alias        |
                    |  GET  /status/:alias         |
                    |  GET  /health                |
                    |  email() handler (inbound)   |
                    +---------+--------+-----------+
                              |        |
                    +---------v-+    +-v-----------+
                    | Resend API |    | Cloudflare  |
                    | (send via  |    | Email       |
                    | HTTP)      |    | Routing     |
                    |            |    | (receive    |
                    | from:      |    |  catch-all  |
                    | alias@     |    |  -> Worker)  |
                    | erasurekit |    |              |
                    | .uk        |    |              |
                    +------------+    +---------+---+
                                               |
                    +---------------------------v---+
                    |     Cloudflare KV              |
                    |                                |
                    |  Namespace: RELAY_STATE         |
                    |  Keys:                          |
                    |    alias:{alias}:meta           |
                    |    alias:{alias}:pubkey         |
                    |    alias:{alias}:queue          |
                    |    alias:{alias}:replies        |
                    |    alias:{alias}:msg:{id}       |
                    |    relay:registry               |
                    |    relay:stats                  |
                    +--------------------------------+
```

### Component Boundaries

| Component | Responsibility | Location | Communicates With |
|-----------|---------------|----------|-------------------|
| **Relay Client** (NEW) | Frontend module that talks to the Worker API. Registers aliases, submits send batches, polls for replies. | `src/lib/relay-client.js` | Worker API (HTTPS), Campaign State, Crypto Module |
| **Crypto Module** (NEW) | Generates ECDH key pairs, encrypts/decrypts email content, exports/imports keys for persistence. | `src/lib/crypto.js` | Relay Client (provides pubkey on register, decrypts replies) |
| **Cloudflare Worker** (NEW) | Receives send requests, dispatches via Resend, receives inbound emails via Email Routing, stores encrypted replies in KV. | `worker/` directory | Resend API, Cloudflare KV, Cloudflare Email Routing |
| **Campaign State** (MODIFIED) | Extended with relay fields: `relayAlias`, `relayUrl`, `keyPair`, `sendQueue`, `replyCache`. | `src/lib/campaign.js` | All frontend components |
| **Status Tracker** (MODIFIED) | New status values for relay lifecycle: `queued`, `relay_sent`, `relay_failed`. Existing `awaiting` reused for post-send. | `src/lib/status-tracker.js` | Campaign State |
| **Template Engine** (UNMODIFIED) | Generates email subject + body. No changes needed -- output is consumed by Relay Client instead of mailto: builder. | `src/lib/template-engine.js` | Identity state, Broker data |

---

## Data Flow

### Flow 1: Campaign Registration (User starts sending)

```
User clicks "Send All" on Brokers page
    |
    v
Crypto Module: generateKeyPair()
    - Uses Web Crypto API: ECDH P-256
    - Returns { publicKey, privateKey } as CryptoKeyPair
    - Exports publicKey as JWK for transmission
    - Stores privateKey in campaign state (never leaves browser)
    |
    v
Relay Client: POST /register
    Request: {
      publicKey: <JWK>,       // user's ECDH public key
    }
    Response: {
      alias: "a7k9x",        // random 5-char alphanumeric
      email: "a7k9x@erasurekit.uk",
      expiresAt: "2026-06-01T00:00:00Z",  // 60-day TTL
      workerPublicKey: <JWK>  // Worker's ECDH public key for this alias
    }
    |
    v
Crypto Module: deriveSharedKey()
    - ECDH: user privateKey + worker publicKey => shared AES-256-GCM key
    - This key encrypts/decrypts all email content for this alias
    |
    v
Campaign State updated:
    campaign.relay = {
      alias: "a7k9x",
      email: "a7k9x@erasurekit.uk",
      relayUrl: "https://relay.erasurekit.uk",
      workerPublicKey: <JWK>,
      expiresAt: "2026-06-01T00:00:00Z",
    }
    campaign.keyPair = {
      publicKey: <JWK>,        // exported for persistence
      privateKey: <JWK>,       // exported for persistence (stays local)
    }
```

### Flow 2: Sending Erasure Requests (Batch dispatch)

```
For each selected broker (batched by daily quota):
    |
    v
Template Engine: getTemplateForBroker(identity, broker, customTemplates)
    Returns: { subject, body }
    |
    v
Crypto Module: encrypt(sharedKey, { subject, body })
    - AES-256-GCM encryption
    - Returns: { ciphertext, iv, tag }  (base64-encoded)
    |
    v
Relay Client: POST /send
    Request: {
      alias: "a7k9x",
      batch: [
        {
          brokerId: "acxiom",
          to: "privacy@acxiom.com",
          encrypted: { ciphertext, iv, tag },  // encrypted { subject, body }
        },
        // ... up to 100 per batch (Resend limit)
      ]
    }
    |
    v
Worker receives POST /send:
    For each item in batch:
        1. Read alias metadata from KV (verify alias exists, not expired)
        2. Derive shared AES key: Worker ECDH privateKey + user publicKey
        3. Decrypt { subject, body } using shared key
        4. Call Resend API:
            from: "a7k9x@erasurekit.uk"
            to: broker email
            reply_to: "a7k9x@erasurekit.uk"
            subject: decrypted subject
            body: decrypted body
        5. Record send result in KV:
            alias:{alias}:sent:{brokerId} = { sentAt, resendId, status }
        6. Re-encrypt result with shared key, store encrypted
    |
    v
Worker responds:
    Response: {
      results: [
        { brokerId: "acxiom", status: "sent", sentAt: "..." },
        { brokerId: "experian", status: "rate_limited", retryAfter: 3600 },
      ]
    }
    |
    v
Campaign State: update broker statuses
    - "sent" -> markBrokerSent(brokerId) -> status: AWAITING
    - "rate_limited" -> keep in queue, schedule retry
    - "failed" -> mark failed, show error to user
```

### Flow 3: Receiving Broker Replies (Inbound email processing)

```
Broker sends reply to a7k9x@erasurekit.uk
    |
    v
Cloudflare Email Routing:
    - catch-all rule forwards ALL @erasurekit.uk to Email Worker
    |
    v
Worker email() handler:
    1. Parse alias from "to" address: "a7k9x" from "a7k9x@erasurekit.uk"
    2. Parse email content with postal-mime:
        - from (broker email)
        - subject
        - text body / HTML body
    3. Look up alias metadata in KV: alias:a7k9x:meta
    4. Verify alias exists and not expired
    5. Look up user's public key: alias:a7k9x:pubkey
    6. Derive shared AES key: Worker ECDH privateKey + user publicKey
    7. Encrypt reply content: { from, subject, textBody, htmlBody, receivedAt }
    8. Store encrypted reply in KV:
        Key: alias:a7k9x:msg:{messageId}
        Value: { encrypted: { ciphertext, iv, tag }, from, receivedAt }
        TTL: 60 days
    9. Append messageId to reply index:
        Key: alias:a7k9x:replies
        Value: [...existingIds, messageId]
    |
    v
(Async -- no immediate notification to user)
```

### Flow 4: Frontend Polls for Replies

```
Frontend polls periodically (every 60 seconds when app is open):
    |
    v
Relay Client: GET /replies/{alias}?since={lastCheckTimestamp}
    |
    v
Worker:
    1. Read reply index from KV: alias:{alias}:replies
    2. Filter to replies after "since" timestamp
    3. Return encrypted reply metadata (not full content)
    Response: {
      replies: [
        { messageId: "msg123", from: "privacy@acxiom.com",
          receivedAt: "2026-04-15T10:30:00Z" },
      ]
    }
    |
    v
Frontend: for each new reply:
    Relay Client: GET /replies/{alias}/msg/{messageId}
    Worker returns encrypted message content from KV
    |
    v
Crypto Module: decrypt(sharedKey, encryptedContent)
    Returns: { from, subject, textBody, htmlBody, receivedAt }
    |
    v
Response Classifier (existing logic, enhanced):
    - Keyword matching on decrypted text body
    - Categories: CONFIRMED, REJECTED, NEEDS_MORE_INFO, AUTO_REPLY, UNCLASSIFIED
    |
    v
Campaign State:
    - Update broker status based on classification
    - Cache decrypted reply in campaign state (local only)
    - Update dashboard stats
```

### Flow 5: Quota-Aware Batching and Calendar Schedule

```
User has 120 selected brokers, daily quota is 100 emails:
    |
    v
Relay Client calculates send schedule:
    Day 1: brokers[0..99]   -> 100 emails
    Day 2: brokers[100..119] -> 20 emails
    |
    v
Campaign State stores send queue:
    campaign.sendQueue = [
      { day: "2026-04-02", brokerIds: [...100 ids], status: "pending" },
      { day: "2026-04-03", brokerIds: [...20 ids], status: "pending" },
    ]
    |
    v
Calendar UI shows the schedule visually
    |
    v
On each scheduled day (when user opens app):
    1. Check if today's batch is due
    2. If yes, auto-send (or prompt user to confirm)
    3. Update queue status: "pending" -> "sent" / "partial"
    |
    v
Campaign resume across sessions:
    - Queue persists in localStorage + file save
    - On app load, check queue for pending batches
    - Resume sending from where it left off
```

---

## E2E Encryption Architecture

### Why E2E Encryption

The Worker decrypts emails only transiently (in Worker memory during the Resend API call). It immediately re-encrypts the reply content before storing in KV. The domain owner (you, the developer) cannot read stored emails in KV because:

1. The Worker generates a fresh ECDH key pair **per alias** (not a global key)
2. The shared secret is derived from (Worker alias-specific private key + User public key)
3. The Worker's per-alias private key exists only in KV, never exported
4. KV values are encrypted with AES-256-GCM using the derived shared secret
5. Without the user's private key (which never leaves their browser), KV values are unreadable

### Key Exchange Protocol

```
Registration:

  Browser                          Worker
  -------                          ------
  Generate ECDH P-256 key pair
  Export publicKey as JWK
                    --- POST /register { publicKey } --->
                                   Generate ECDH P-256 key pair for this alias
                                   Store alias privateKey in KV (encrypted at rest)
                                   Store user publicKey in KV
                    <-- { alias, workerPublicKey } ---
  Derive sharedKey = ECDH(
    userPrivateKey,
    workerPublicKey
  )
  Store privateKey locally
  (JWK in campaign state,
   never transmitted)
```

### Encryption Flow (Outbound)

```
Browser:
  plaintext = { subject: "GDPR...", body: "Dear DPO..." }
  iv = crypto.getRandomValues(new Uint8Array(12))
  ciphertext = AES-256-GCM.encrypt(sharedKey, iv, plaintext)
  --> sends { ciphertext, iv } to Worker

Worker:
  Derives same sharedKey = ECDH(workerPrivateKey, userPublicKey)
  plaintext = AES-256-GCM.decrypt(sharedKey, iv, ciphertext)
  --> Sends plaintext email via Resend
  --> Discards plaintext from memory
```

### Encryption Flow (Inbound Reply)

```
Worker (email handler):
  Receives reply email from broker
  Parses with postal-mime: { from, subject, text, html }
  Derives sharedKey = ECDH(workerPrivateKey, userPublicKey)
  iv = crypto.getRandomValues(new Uint8Array(12))
  encryptedReply = AES-256-GCM.encrypt(sharedKey, iv, replyContent)
  Stores encryptedReply in KV
  Discards plaintext from memory

Browser (on poll):
  Fetches encryptedReply from Worker
  Derives same sharedKey = ECDH(userPrivateKey, workerPublicKey)
  plaintext = AES-256-GCM.decrypt(sharedKey, iv, encryptedReply)
  Displays to user
```

### Crypto Implementation Details

```javascript
// Both browser and Cloudflare Workers support the same Web Crypto API

// Key generation
const keyPair = await crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  true,  // extractable (for JWK export/import)
  ['deriveKey']
);

// Export public key as JWK (for transmission)
const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

// Derive shared AES key from ECDH
const sharedKey = await crypto.subtle.deriveKey(
  { name: 'ECDH', public: otherPartyPublicKey },
  myPrivateKey,
  { name: 'AES-GCM', length: 256 },
  false,  // not extractable
  ['encrypt', 'decrypt']
);

// Encrypt
const iv = crypto.getRandomValues(new Uint8Array(12));
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  sharedKey,
  new TextEncoder().encode(JSON.stringify(plaintext))
);

// Decrypt
const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  sharedKey,
  ciphertext
);
const plaintext = JSON.parse(new TextDecoder().decode(decrypted));
```

**Confidence: HIGH** -- ECDH P-256 and AES-256-GCM are both supported in Cloudflare Workers Web Crypto API (verified via official docs) and in all modern browsers. The W3C Web Cryptography API Level 2 spec governs both environments.

### Key Persistence

The user's private key must survive across sessions. Two storage strategies:

1. **JWK in campaign state** (recommended): Export the CryptoKey as JWK, store in the campaign signal. Persists to localStorage (auto-save) and to the JSON save file. On reload, import the JWK back into a CryptoKey via `crypto.subtle.importKey('jwk', ...)`.

2. **IndexedDB CryptoKey store** (alternative): Store the CryptoKey directly in IndexedDB as a non-extractable key. More secure (key material cannot be read even by JS), but does not survive file export/import. Not recommended for a portable app that relies on file-based persistence.

**Decision: Use JWK export.** The private key in the campaign JSON file is acceptable because:
- The file is local-only (never uploaded anywhere)
- Without the Worker's per-alias private key (stored in KV, never exported), the user's private key alone cannot decrypt anything
- The key pair is ephemeral -- generated per campaign, discarded when the campaign completes

### Threat Model

| Threat | Mitigation |
|--------|-----------|
| Domain owner reads KV | All email content encrypted with per-alias shared key. Owner has Worker code but not user's private key. |
| Attacker compromises KV | Same as above. Encrypted at rest with AES-256-GCM. |
| Attacker compromises Worker code | Could modify Worker to log plaintext during transit. Mitigated by: open-source code, reproducible builds, code review. This is the standard trust boundary for any server-side component. |
| Attacker intercepts HTTPS | TLS protects in-transit. Even without TLS, content is E2E encrypted. |
| User loses private key | Campaign cannot decrypt replies. User must start a new campaign with a new alias. Documented clearly in UI. |
| Resend reads email content | Resend processes plaintext email for delivery. This is inherent to email -- SMTP is not encrypted end-to-end. The E2E encryption protects storage, not SMTP transit. |

**Important caveat:** The Worker necessarily sees plaintext email content during the Resend API call (it must decrypt to construct the SMTP message). True zero-knowledge would require the user's browser to call Resend directly, but Resend blocks CORS from browsers. The E2E encryption protects **stored data** (KV) and ensures the domain owner cannot retroactively read emails by inspecting KV. It does NOT prevent a malicious Worker from logging plaintext during execution. This is documented honestly on the About page.

---

## Cloudflare KV Schema

### Namespace: RELAY_STATE

| Key Pattern | Value | TTL | Purpose |
|-------------|-------|-----|---------|
| `alias:{alias}:meta` | `{ alias, createdAt, expiresAt, brokerCount, lastActivity }` | 60 days | Alias metadata and lifecycle |
| `alias:{alias}:pubkey` | `{ jwk: <user's ECDH public key JWK> }` | 60 days | User's public key for encryption |
| `alias:{alias}:workerkey` | `{ jwk: <worker's ECDH private key JWK> }` | 60 days | Worker's per-alias private key (never exposed via API) |
| `alias:{alias}:queue` | `[{ brokerId, to, encrypted, status, scheduledFor }]` | 60 days | Pending send queue (encrypted payloads) |
| `alias:{alias}:sent:{brokerId}` | `{ sentAt, resendMessageId, status }` | 60 days | Per-broker send record |
| `alias:{alias}:replies` | `[{ messageId, from, receivedAt }]` | 60 days | Reply index (unencrypted metadata for filtering) |
| `alias:{alias}:msg:{messageId}` | `{ encrypted: { ciphertext, iv }, from, receivedAt }` | 60 days | Individual encrypted reply content |
| `relay:registry` | `[{ domain, resendApiKeyHash, maxDaily, status, healthCheck }]` | none | Relay domain registry (for multi-domain scaling) |
| `relay:stats` | `{ totalSent, totalReplies, activeAliases, ... }` | none | Aggregate relay statistics |

### KV Free Tier Budget Analysis

| Operation | Daily Free Limit | Expected Daily Usage (100 users) | Verdict |
|-----------|-----------------|----------------------------------|---------|
| Reads | 100,000 | ~5,000 (50 polls/user x 100 users) | Comfortable |
| Writes | 1,000 | ~200 (2 writes/send x 100 sends) | Comfortable |
| Deletes | 1,000 | ~10 (expired alias cleanup) | Comfortable |
| Lists | 1,000 | ~100 (reply index lookups) | Comfortable |
| Storage | 1 GB | ~50 MB (500 bytes/message x 100K messages) | Comfortable |

**The 1,000 writes/day limit is the binding constraint.** Each email send requires ~2 KV writes (send record + queue update). Each inbound reply requires ~2 KV writes (message storage + reply index update). At 100 emails sent + 50 replies received per day, that is ~300 writes. Leaves headroom for ~350 more operations.

**Scaling note:** If usage exceeds free tier, the $5/month paid plan provides 1 million writes/day -- effectively unlimited for this use case.

---

## Relay Registry and Health Checking

### Registry Format

The relay registry enables multi-domain scaling. Contributors donate $2/year domains, each adding 3,000 emails/month capacity.

```javascript
// KV key: relay:registry
{
  domains: [
    {
      domain: "erasurekit.uk",         // primary domain
      workerUrl: "https://relay.erasurekit.uk",
      resendRegion: "eu-west-1",       // Resend EU region
      maxDailyEmails: 100,             // Resend free tier
      maxMonthlyEmails: 3000,          // Resend free tier
      status: "active",                // active | degraded | offline
      lastHealthCheck: "2026-04-01T12:00:00Z",
      currentDailyUsage: 42,
      currentMonthlyUsage: 1250,
      addedAt: "2026-04-01T00:00:00Z",
      owner: "project",               // "project" or contributor alias
    },
    {
      domain: "erasure-relay-2.uk",    // contributor domain
      workerUrl: "https://relay.erasure-relay-2.uk",
      resendRegion: "eu-west-1",
      maxDailyEmails: 100,
      maxMonthlyEmails: 3000,
      status: "active",
      lastHealthCheck: "2026-04-01T12:00:00Z",
      currentDailyUsage: 0,
      currentMonthlyUsage: 0,
      addedAt: "2026-04-15T00:00:00Z",
      owner: "contributor-abc",
    },
  ]
}
```

### Load Balancing Strategy

The frontend picks a relay domain using least-loaded selection:

```javascript
// Frontend: select relay with most remaining daily quota
function selectRelay(registry) {
  const active = registry.domains.filter(d => d.status === 'active');
  if (active.length === 0) throw new Error('No active relays');

  // Sort by remaining daily capacity (descending)
  active.sort((a, b) => {
    const remainA = a.maxDailyEmails - a.currentDailyUsage;
    const remainB = b.maxDailyEmails - b.currentDailyUsage;
    return remainB - remainA;
  });

  return active[0];
}
```

### Health Checking

```javascript
// Worker: cron trigger runs every 5 minutes
export default {
  async scheduled(event, env) {
    const registry = JSON.parse(await env.KV.get('relay:registry'));
    for (const domain of registry.domains) {
      try {
        const res = await fetch(`${domain.workerUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        domain.status = res.ok ? 'active' : 'degraded';
      } catch {
        domain.status = 'offline';
      }
      domain.lastHealthCheck = new Date().toISOString();
    }
    await env.KV.put('relay:registry', JSON.stringify(registry));
  },
};
```

### Frontend Health Display

The frontend shows relay health on the About page and in the send UI:

```
Relay Status: [=] erasurekit.uk (58/100 remaining today)
              [=] erasure-relay-2.uk (100/100 remaining today)
              Total capacity: 158 emails remaining today
```

---

## Worker API Design

### Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/register` | Create new alias with user's public key | None (alias is the auth) |
| `POST` | `/send` | Submit encrypted email batch for sending | Alias + signature |
| `GET` | `/replies/:alias` | List reply metadata since timestamp | Alias in URL |
| `GET` | `/replies/:alias/msg/:id` | Get encrypted reply content | Alias in URL |
| `GET` | `/status/:alias` | Get alias status, quota, send history | Alias in URL |
| `GET` | `/health` | Worker health check | None |
| `GET` | `/registry` | Get relay registry (public) | None |
| `DELETE` | `/alias/:alias` | Delete alias and all associated data | Alias + signature |
| `email` | (Email Routing) | Process inbound emails | N/A (Cloudflare internal) |

### Authentication Model

No user accounts. Authentication uses the alias itself as an identifier, combined with a signature proving the caller holds the private key:

```javascript
// Frontend: sign a challenge to prove key ownership
async function authenticatedRequest(url, body, privateKey) {
  const timestamp = Date.now().toString();
  const payload = JSON.stringify(body) + timestamp;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,  // same key pair used for ECDH
    new TextEncoder().encode(payload)
  );

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Alias': alias,
      'X-Timestamp': timestamp,
      'X-Signature': base64Encode(signature),
    },
    body: JSON.stringify(body),
  });
}

// Worker: verify signature
async function verifyRequest(request, env) {
  const alias = request.headers.get('X-Alias');
  const timestamp = request.headers.get('X-Timestamp');
  const signature = base64Decode(request.headers.get('X-Signature'));

  // Reject if timestamp is too old (5 minute window)
  if (Date.now() - parseInt(timestamp) > 300000) return null;

  // Look up user's public key
  const pubkeyData = await env.KV.get(`alias:${alias}:pubkey`, 'json');
  if (!pubkeyData) return null;

  const publicKey = await crypto.subtle.importKey(
    'jwk', pubkeyData.jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['verify']
  );

  const body = await request.text();
  const payload = body + timestamp;
  const valid = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    new TextEncoder().encode(payload)
  );

  return valid ? alias : null;
}
```

**Note on dual-use keys:** ECDH and ECDSA both use P-256 curves but have different key usages. The key pair must be generated with `['deriveKey', 'deriveBits']` for ECDH and separately with `['sign', 'verify']` for ECDSA. In practice, generate two key pairs per alias: one for encryption (ECDH), one for authentication (ECDSA). Or use a single key pair and derive both capabilities -- but Web Crypto API does not allow combining `deriveKey` and `sign` usages on one key. **Use two key pairs** (encryption + signing).

---

## Campaign State Extension

### Modified Campaign Schema

```javascript
// Extended createEmptyCampaign() for v2.0
export function createEmptyCampaign() {
  return {
    version: 3,  // bumped from 2
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    identity: {
      fullName: '',
      emails: [''],
      phone: '',
      address: '',
    },
    brokers: { selected: [], templates: {} },

    // v2.0 relay fields (NEW)
    relay: {
      alias: null,              // e.g. "a7k9x"
      email: null,              // e.g. "a7k9x@erasurekit.uk"
      relayUrl: null,           // e.g. "https://relay.erasurekit.uk"
      relayDomain: null,        // e.g. "erasurekit.uk"
      workerPublicKey: null,    // JWK -- worker's ECDH public key
      registeredAt: null,       // ISO timestamp
      expiresAt: null,          // ISO timestamp (60-day TTL)
    },
    keyPair: {
      encryptionPublic: null,   // JWK -- user's ECDH public key
      encryptionPrivate: null,  // JWK -- user's ECDH private key (LOCAL ONLY)
      signingPublic: null,      // JWK -- user's ECDSA public key
      signingPrivate: null,     // JWK -- user's ECDSA private key (LOCAL ONLY)
    },
    sendQueue: [],              // [{ day, brokerIds, status }]
    replyCache: {},             // { [messageId]: decryptedReply }

    // Existing fields (unchanged)
    tempEmail: null,            // deprecated (was mail.tm)
    messages: [],               // deprecated (was mail.tm messages)
    statuses: {},
    settings: {},
  };
}
```

### Migration from v2 to v3

```javascript
export function migrateCampaign(data) {
  if (!data || typeof data !== 'object') return null;
  if (!data.version) return null;
  if (data.version > CURRENT_VERSION) return null;

  const empty = createEmptyCampaign();

  if (data.version === 2) {
    // Migrate v2 -> v3: add relay fields, preserve existing data
    return {
      ...empty,
      ...data,
      version: 3,
      relay: empty.relay,        // new
      keyPair: empty.keyPair,    // new
      sendQueue: [],             // new
      replyCache: {},            // new
      identity: { ...empty.identity, ...(data.identity || {}) },
      brokers: { ...empty.brokers, ...(data.brokers || {}) },
      updatedAt: new Date().toISOString(),
    };
  }

  // Standard merge for same version
  return {
    ...empty,
    ...data,
    identity: { ...empty.identity, ...(data.identity || {}) },
    brokers: { ...empty.brokers, ...(data.brokers || {}) },
    relay: { ...empty.relay, ...(data.relay || {}) },
    keyPair: { ...empty.keyPair, ...(data.keyPair || {}) },
    updatedAt: new Date().toISOString(),
    version: CURRENT_VERSION,
  };
}
```

---

## Resend Integration Details

### Domain Setup

1. Add `erasurekit.uk` domain in Resend dashboard
2. Add DNS records to Cloudflare:
   - SPF: `v=spf1 include:amazonses.com ~all` (Resend uses AWS SES)
   - DKIM: Three CNAME records provided by Resend
   - DMARC: `v=DMARC1; p=none;` (start with monitoring, tighten later)
3. Verify domain in Resend dashboard

### API Call from Worker

```javascript
// Worker: send via Resend
async function sendViaResend(env, fromAlias, toEmail, subject, body) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `ErasureKit <${fromAlias}@erasurekit.uk>`,
      to: toEmail,
      reply_to: `${fromAlias}@erasurekit.uk`,
      subject: subject,
      text: body,
      headers: {
        'X-ErasureKit-Alias': fromAlias,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    if (response.status === 429) {
      return { status: 'rate_limited', retryAfter: 3600 };
    }
    return { status: 'failed', error: error.message };
  }

  const result = await response.json();
  return { status: 'sent', resendId: result.id };
}
```

### Rate Limiting Strategy

- Resend free tier: 100 emails/day, 3,000/month
- Resend batch API: max 100 emails per batch request
- Worker implements a token bucket per relay domain
- Frontend shows remaining daily quota in the UI
- If quota exhausted: queue remaining emails for tomorrow
- Calendar UI shows multi-day send schedule

### Deliverability Considerations

| Concern | Mitigation |
|---------|-----------|
| New domain reputation | Start slow (10/day week 1, ramp to 100/day). Resend handles warm-up. |
| Disposable email blocking | `erasurekit.uk` is a custom domain, NOT on disposable email blocklists. Custom domains are not blocked. |
| SPF/DKIM/DMARC | Properly configured via Resend. All modern email providers require this. |
| "On behalf of" display | With proper DKIM signing via Resend, this should not appear. |
| Bounces | Resend handles bounce processing. Webhook events available for tracking. |

---

## Cloudflare Email Routing Configuration

### Catch-All Rule

In Cloudflare dashboard > Email Routing:
- **Catch-all rule**: Route to Email Worker
- **No custom addresses**: All emails go through the Worker
- This means ANY address `*@erasurekit.uk` is processed by the Worker

### Email Worker Handler

```javascript
import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    // 1. Extract alias from "to" address
    const toAddress = message.to;
    const alias = toAddress.split('@')[0];

    // 2. Check alias exists
    const meta = await env.KV.get(`alias:${alias}:meta`, 'json');
    if (!meta) {
      // Unknown alias -- reject
      message.setReject('Unknown recipient');
      return;
    }

    // 3. Check alias not expired
    if (new Date(meta.expiresAt) < new Date()) {
      message.setReject('Recipient no longer active');
      return;
    }

    // 4. Parse email content
    const rawEmail = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(rawEmail);

    // 5. Encrypt reply content
    const replyContent = {
      from: message.from,
      subject: parsed.subject,
      textBody: parsed.text || '',
      htmlBody: parsed.html || '',
      receivedAt: new Date().toISOString(),
    };

    // Load keys and derive shared secret
    const workerKeyData = await env.KV.get(`alias:${alias}:workerkey`, 'json');
    const userPubData = await env.KV.get(`alias:${alias}:pubkey`, 'json');

    const workerPrivateKey = await crypto.subtle.importKey(
      'jwk', workerKeyData.jwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false, ['deriveKey']
    );
    const userPublicKey = await crypto.subtle.importKey(
      'jwk', userPubData.jwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false, []
    );

    const sharedKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: userPublicKey },
      workerPrivateKey,
      { name: 'AES-GCM', length: 256 },
      false, ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      new TextEncoder().encode(JSON.stringify(replyContent))
    );

    // 6. Store encrypted reply
    const messageId = crypto.randomUUID();
    await env.KV.put(
      `alias:${alias}:msg:${messageId}`,
      JSON.stringify({
        encrypted: {
          ciphertext: base64Encode(encrypted),
          iv: base64Encode(iv),
        },
        from: message.from,  // unencrypted for reply index
        receivedAt: replyContent.receivedAt,
      }),
      { expirationTtl: 60 * 86400 }  // 60 days
    );

    // 7. Update reply index
    const replyIndex = await env.KV.get(`alias:${alias}:replies`, 'json') || [];
    replyIndex.push({
      messageId,
      from: message.from,
      receivedAt: replyContent.receivedAt,
    });
    await env.KV.put(
      `alias:${alias}:replies`,
      JSON.stringify(replyIndex),
      { expirationTtl: 60 * 86400 }
    );

    // 8. Update alias activity
    meta.lastActivity = new Date().toISOString();
    await env.KV.put(`alias:${alias}:meta`, JSON.stringify(meta), {
      expirationTtl: 60 * 86400,
    });
  },
};
```

---

## Frontend Integration Points

### Modified Files

| File | Change Type | What Changes |
|------|-------------|-------------|
| `src/lib/campaign.js` | MODIFIED | Add relay fields, bump version to 3, update migration |
| `src/lib/email-sender.js` | REPLACED | Replace mailto:/clipboard with relay client calls |
| `src/lib/status-tracker.js` | MODIFIED | Add `QUEUED` and `RELAY_SENT` statuses |
| `src/app.js` | MODIFIED | Add new page routes (send schedule, relay status) |
| `src/lib/router.js` | MODIFIED | Add new page IDs |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/relay-client.js` | HTTP client for Worker API (register, send, poll, status) |
| `src/lib/crypto.js` | Web Crypto wrapper (key gen, ECDH, AES-GCM encrypt/decrypt) |
| `src/pages/Send.js` | Send UI with batch progress, calendar schedule, quota display |
| `src/pages/Replies.js` | Reply viewer with decrypted messages and classification |
| `src/components/RelayStatus.js` | Relay health indicator component |
| `src/components/SendSchedule.js` | Calendar-style send schedule visualization |
| `worker/index.js` | Cloudflare Worker entry point (HTTP + email handlers) |
| `worker/wrangler.toml` | Worker configuration (KV bindings, email routing, secrets) |

### Unmodified Files

| File | Why Unchanged |
|------|--------------|
| `src/lib/template-engine.js` | Generates { subject, body } -- consumed by relay client instead of mailto: builder |
| `src/lib/brokers-loader.js` | Loads brokers.json -- no relay dependency |
| `src/lib/theme.js` | UI chrome -- no relay dependency |
| `src/lib/notifications.js` | Toast system -- no relay dependency |
| `src/pages/Identity.js` | Identity form -- no relay dependency |
| `src/pages/Brokers.js` | Broker selection -- no relay dependency |
| `src/pages/About.js` | Content page -- will add privacy architecture explanation but no code changes |
| `src/components/Header.js` | App header -- no relay dependency |
| `src/components/Footer.js` | Auto-save indicator -- no relay dependency |

---

## Suggested Build Order

Phases are ordered by dependency. Each phase produces independently testable functionality.

```
Phase 1: Crypto Foundation
  [1] src/lib/crypto.js
      - ECDH P-256 key pair generation
      - ECDSA P-256 key pair generation
      - AES-256-GCM encrypt/decrypt
      - JWK export/import for persistence
      - Unit tests (vitest with Web Crypto polyfill or jsdom)
  [2] Campaign schema v3 + migration
      - Add relay/keyPair/sendQueue/replyCache fields
      - v2 -> v3 migration in migrateCampaign()
      - Unit tests

Phase 2: Worker Infrastructure
  [3] worker/ scaffold
      - wrangler.toml with KV binding, email routing
      - POST /register endpoint
      - GET /health endpoint
      - Resend API integration (send single email)
      - KV schema for alias storage
  [4] Email routing handler
      - email() handler receives inbound
      - Parse with postal-mime
      - Encrypt and store in KV
  [5] Worker API completion
      - POST /send (batch send)
      - GET /replies/:alias
      - GET /replies/:alias/msg/:id
      - GET /status/:alias
      - DELETE /alias/:alias
      - Signature verification

Phase 3: Frontend Relay Client
  [6] src/lib/relay-client.js
      - register(publicKey) -> alias
      - sendBatch(alias, items) -> results
      - pollReplies(alias, since) -> replies
      - getReplyContent(alias, messageId) -> encrypted content
      - getStatus(alias) -> { quota, sent, replies }
  [7] Replace email-sender.js
      - sendToBroker() now uses relay client
      - batchSend() now queues to Worker
      - Quota-aware scheduling

Phase 4: Send UI
  [8] Send page with schedule calendar
      - Shows daily send batches
      - Progress bar during batch send
      - Quota remaining display
  [9] Relay status component
      - Health indicator in header
      - Registry info on About page

Phase 5: Reply Monitoring
  [10] Reply polling + decryption
      - Periodic poll in background
      - Decrypt replies using shared key
      - Classify responses
      - Update broker statuses
  [11] Reply viewer page
      - List of decrypted replies
      - Per-broker reply history
      - Manual status override

Phase 6: Multi-Domain Scaling
  [12] Relay registry
      - Load balancing across domains
      - Contributor donation flow documentation
  [13] Privacy documentation
      - About page architecture explanation
      - Honest threat model disclosure
```

**Critical path:** Phase 1 -> Phase 2 -> Phase 3 -> Phase 4. Phases 5 and 6 can overlap with Phase 4.

**Key dependency:** The Worker must be deployed and accessible before the frontend relay client can be tested against real infrastructure. Use `wrangler dev` for local development, but email routing requires the domain to be live on Cloudflare.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Global Worker Key Pair

**What:** Using a single ECDH key pair for all aliases.

**Why bad:** Compromise of one shared secret exposes ALL user data. The domain owner could derive every user's shared key.

**Instead:** Generate a fresh ECDH key pair per alias. Store in KV under `alias:{alias}:workerkey`. Delete when alias expires.

### Anti-Pattern 2: Storing Plaintext in KV

**What:** Storing email subjects, bodies, or reply content in KV without encryption.

**Why bad:** Domain owner (or anyone with KV access) can read all user emails.

**Instead:** Always encrypt with the per-alias shared key before KV storage. Only store unencrypted metadata needed for indexing (from address, receivedAt timestamp).

### Anti-Pattern 3: Polling Without Rate Control

**What:** Frontend polls `/replies/:alias` every 5 seconds.

**Why bad:** Burns through KV read quota (100K/day free). Broker replies take hours/days, not seconds.

**Instead:** Poll every 60 seconds while the app is in the foreground. Use `document.hidden` to pause polling when the tab is backgrounded. On visibility resume, do a catch-up poll.

### Anti-Pattern 4: Sending All Emails in One Batch

**What:** Submitting 169 brokers to the Worker in a single POST /send request.

**Why bad:** Resend has a 100/day limit. The Worker will fail partway through, leaving some brokers sent and others not, with unclear state.

**Instead:** Frontend calculates the schedule (100/day) and sends in daily batches. Each batch is a separate POST /send with at most 100 items. Queue state persists in campaign state for resume across sessions.

### Anti-Pattern 5: Blocking on Inbound Email Processing

**What:** The email() handler does heavy processing synchronously.

**Why bad:** Email Workers have a 30-second execution limit. Complex encryption + multiple KV writes could hit it.

**Instead:** Use `ctx.waitUntil()` for KV writes after the critical path (parsing + alias validation). Reject unknown aliases immediately to fail fast.

---

## Sources

### HIGH Confidence (Official docs, verified)

- [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/email-workers/) -- Email routing to Worker handler
- [Cloudflare Email Workers Runtime API](https://developers.cloudflare.com/email-routing/email-workers/runtime-api/) -- ForwardableEmailMessage interface
- [Cloudflare Web Crypto API](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) -- Supported algorithms (ECDH, AES-GCM confirmed)
- [Cloudflare KV Limits](https://developers.cloudflare.com/kv/platform/limits/) -- 100K reads, 1K writes/day free
- [Cloudflare KV Pricing](https://developers.cloudflare.com/kv/platform/pricing/) -- Free tier details
- [Resend + Cloudflare Workers tutorial](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/) -- Official integration guide
- [Resend + Workers example](https://resend.com/docs/send-with-cloudflare-workers) -- Resend official docs
- [Resend Rate Limits](https://resend.com/docs/api-reference/rate-limit) -- 100/day, 3000/month free
- [Resend Custom Headers](https://resend.com/changelog/custom-email-headers) -- Reply-To support
- [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) -- ECDH, AES-GCM reference
- [MDN SubtleCrypto.deriveKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) -- ECDH key derivation examples
- [W3C Web Cryptography API Level 2](https://w3c.github.io/webcrypto/) -- W3C spec

### MEDIUM Confidence (Community verified, multiple sources agree)

- [postal-mime for Email Workers](https://blog.emailengine.app/how-to-parse-emails-with-cloudflare-email-workers/) -- Parsing inbound emails
- [Process incoming emails with Workers + D1](https://dev.to/elvisans/how-to-process-incoming-emails-and-trigger-webhooks-in-app-actions-and-more-using-cloudflare-5d07) -- Full inbound processing pattern
- [Cloudflare Email Routing catch-all](https://developers.cloudflare.com/email-routing/setup/email-routing-addresses/) -- Catch-all to Worker
- [Resend domain authentication](https://dmarcdkim.com/setup/how-to-setup-resend-spf-dkim-and-dmarc-records) -- SPF/DKIM setup
- [Disposable email blocklists](https://gist.github.com/philippdormann/989d79da6526c108076b915e283d1904) -- 5K+ temp domains listed (erasurekit.uk is NOT on these)

### LOW Confidence (Single source, needs validation)

- [Cloudflare Email Service private beta](https://blog.cloudflare.com/email-service/) -- Native email sending from Workers. Could replace Resend if it exits beta. Monitor but do not depend on.
- [Workers KV rearchitecture](https://www.infoq.com/news/2025/08/cloudflare-workers-kv/) -- KV reliability improvements after 2025 GCP outage. Relevant for trust in KV as storage layer.

# Phase 5: Relay Infrastructure and E2E Encryption - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 05-relay-infrastructure-and-e2e-encryption
**Areas discussed:** Worker API design, Temp address lifecycle, E2E encryption model, Resend integration

---

## Worker API Design

### Auth Model

| Option | Description | Selected |
|--------|-------------|----------|
| Open + rate limit | No API key, rate-limited per IP via Cloudflare | |
| Campaign token | Worker issues one-time token on first request | |
| Proof-of-work challenge | Browser solves puzzle before each send | |

**User's choice:** "You decide"
**Notes:** Claude's discretion. Will use open + rate limiting (simplest for no-account portable app).

### Endpoints

| Option | Description | Selected |
|--------|-------------|----------|
| Single /send | One POST endpoint, extend later | ✓ |
| Multiple endpoints | /send, /quota, /health, /replies from start | |
| Single /api with action field | Multiplexed single entry point | |

**User's choice:** Single /send

### CORS

| Option | Description | Selected |
|--------|-------------|----------|
| Allow all origins | Access-Control-Allow-Origin: * | ✓ |
| Allow specific origins | Whitelist erasurekit.uk, localhost, file:// | |

**User's choice:** Allow all origins

### Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Structured JSON | { success, error?: { code, message }, data? } | ✓ |
| HTTP status codes only | 429/400/502 with minimal body | |

**User's choice:** Structured JSON

---

## Temp Address Lifecycle

### Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Browser-generated random | crypto.getRandomValues, 5-8 char slug | ✓ |
| Worker-generated | POST /address returns unique slug | |
| Hash-based deterministic | Hash campaign ID for predictable address | |

**User's choice:** Browser-generated random

### Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Campaign file only | Stored in campaign.tempEmail, KV maps to public key | ✓ |
| Worker KV as primary | KV stores mapping, browser holds reference | |
| Both with sync | Campaign file + KV mirror with sync | |

**User's choice:** Campaign file only

### Expiry

| Option | Description | Selected |
|--------|-------------|----------|
| 90-day TTL | KV entry expires after 90 days | |
| No expiry | Lives forever in KV | |
| User-controlled | User explicitly deletes | |

**User's choice:** User-controlled (custom response)
**Notes:** "Delete when all brokers replied and all escalations are over. Or delete when user chooses to stop the process. Some sort of stop button." Combined with safety-net TTL for abandoned campaigns.

### Slug Length

| Option | Description | Selected |
|--------|-------------|----------|
| 8 chars | a7k9x3mq@erasurekit.uk, 36^8 combinations | ✓ |
| 5 chars | a7k9x@erasurekit.uk, 36^5 combinations | |
| UUID-based | First 8 of UUID | |

**User's choice:** 8 chars

### Multi-Campaign

| Option | Description | Selected |
|--------|-------------|----------|
| Multiple allowed | No restriction per IP | ✓ |
| One active per IP | Single temp address per IP | |

**User's choice:** Multiple allowed

---

## E2E Encryption Model

### Encryption Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Encrypt body only | Worker sees recipient, subject, sender; cannot see body | ✓ |
| Encrypt body + subject | Worker sees recipient and sender only | |
| Encrypt everything | Worker sees nothing, blind proxy | |

**User's choice:** Encrypt body only

### Key Management

| Option | Description | Selected |
|--------|-------------|----------|
| Per-campaign in file | Web Crypto key pair, private key in campaign JSON | ✓ |
| Per-campaign in localStorage | Key pair in localStorage only | |
| Derive from passphrase | PBKDF2 from user passphrase | |

**User's choice:** Per-campaign, stored in campaign file

### Algorithm

| Option | Description | Selected |
|--------|-------------|----------|
| RSA-OAEP + AES-GCM | Standard hybrid encryption | |
| ECDH + AES-GCM | Smaller keys, faster | |
| You decide | Claude picks | |

**User's choice:** "You decide"
**Notes:** Claude's discretion on algorithm selection.

---

## Resend Integration

### API Key Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Worker env variable | wrangler secret, never exposed to browser | ✓ |
| Worker KV | Stored in KV for rotation flexibility | |
| Encrypted in code | Embedded in Worker source | |

**User's choice:** Worker environment variable

### Reply-To Header

| Option | Description | Selected |
|--------|-------------|----------|
| Reply-To = temp address | Same temp address for send and receive | ✓ |
| Dedicated replies subdomain | Separate routing for replies | |
| No Reply-To in Phase 5 | Add in Phase 7 | |

**User's choice:** Reply-To = temp address

### Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate error, frontend retries | Structured error with retry-after hint | ✓ |
| Worker queues and retries | KV queue with Cron Trigger retry | |
| Dead-letter with manual retry | Failed sends in KV, manual retry | |

**User's choice:** Immediate error, frontend retries

### Region

| Option | Description | Selected |
|--------|-------------|----------|
| Global with EU Resend | Worker global, Resend in eu-west-1 | ✓ |
| EU-only Worker | Restrict Worker to EU data centers | |

**User's choice:** Global with EU Resend

---

## Claude's Discretion

- Auth model (recommended: open + IP rate limiting)
- Encryption algorithm (recommended: RSA-OAEP + AES-GCM)

## Deferred Ideas

None — discussion stayed within phase scope

# Technology Stack — v2.0 Relay-Based Email Architecture

**Project:** ErasureKit
**Researched:** 2026-04-01
**Scope:** NEW stack additions for relay-based email sending (Cloudflare Worker + Resend + Email Routing + KV + E2E encryption)
**Supersedes:** v1.0 stack research (2026-03-28)

> This document covers what is new for v2.0. The existing validated stack (Preact + HTM + Signals + Tailwind v4 + Vite + browser-fs-access + date-fns) remains unchanged.

---

## CRITICAL: Windows 10 Compatibility Issue

Wrangler 4.x (v4.79.0, latest) officially supports only **macOS 13.5+, Windows 11, and Linux (glibc 2.35+)**. The dev machine runs **Windows 10 Pro 10.0.19045**. The `workerd` runtime bundled with Wrangler cannot run `wrangler dev` on Windows 10 -- confirmed by [official docs](https://developers.cloudflare.com/workers/wrangler/install-and-update/) and [GitHub issue #11593](https://github.com/cloudflare/workers-sdk/issues/11593) (same Windows build).

**`wrangler deploy` may still work** (it bundles and uploads via HTTP, doesn't need workerd locally), but is not officially supported. The workerd binary is installed regardless.

**Recommended development workflow:**

| Task | How | Where |
|------|-----|-------|
| **Deploy to production** | GitHub Actions (`cloudflare/wrangler-action@v3`) | CI (Ubuntu) |
| **Quick edits + test** | Cloudflare Dashboard editor | Browser |
| **Full local dev** (optional) | WSL2 (Ubuntu 22.04+) | Local |
| **Test Worker endpoints** | `curl` / browser against deployed staging Worker | Local |

The Worker code is small (~200 lines) making the Dashboard editor viable. GitHub Actions handles production deploys automatically on push.

**Confidence: HIGH** -- OS requirement verified in official Cloudflare docs. Windows 10 crash confirmed in GitHub issues.

---

## v2.0 Stack Additions

### Relay Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Cloudflare Workers | Free tier | Relay server (HTTP API + email handler) | Serverless, 100K req/day free, global edge, native Web Crypto API, KV bindings |
| Cloudflare Email Routing | Free tier | Receive inbound broker replies | Catch-all routes all `*@erasurekit.uk` to Email Worker. Free, unlimited inbound. |
| Cloudflare KV | Free tier | Persistent relay state storage | 100K reads/day, 1K writes/day, 1GB storage. Key-value model fits alias-based data. |
| Resend REST API | v1 (raw `fetch`) | Send GDPR emails from `@erasurekit.uk` | 100/day, 3,000/month free. eu-west-1 (Ireland) region. HTTP API -- no SDK needed. |
| Wrangler CLI | ^4.79.0 | Worker deployment + secret management | Official Cloudflare CLI. Run via CI (GitHub Actions), not locally on Win10. |

### Email Processing

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| postal-mime | ^2.7.3 | Parse inbound email MIME content | Zero dependencies. Built for Workers and browsers. TypeScript. RFC 2822/5322. Replaces maintenance-mode mailparser. |
| mimetext | ^3.0.28 | Compose MIME messages (deferred) | RFC-5322 MIME composer. Only needed if sending auto-replies via `cloudflare:email` binding. Defer until reply monitoring is fully implemented. |

### Cryptography (E2E Encryption)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Web Crypto API (`crypto.subtle`) | W3C Level 2 | All cryptographic operations | Native in both browsers AND Cloudflare Workers. Zero dependencies. Same API on both sides. |
| RSA-OAEP (2048-bit, SHA-256) | (algorithm) | Asymmetric key exchange | Browser generates keypair. Public key sent to Worker. Worker encrypts reply data that only browser can decrypt. |
| AES-256-GCM | (algorithm) | Authenticated bulk encryption | Encrypts email bodies (1KB-1MB). Provides confidentiality + integrity (tamper detection). |
| PBKDF2 | (algorithm) | Passphrase-based key derivation | Encrypts private key in save file. User sets passphrase for backup recovery. |

**Encryption scheme -- Hybrid RSA-OAEP + AES-GCM:**

```
BROWSER (campaign creation):
  1. generateKey("RSA-OAEP", 2048, SHA-256) -> {publicKey, privateKey}
  2. exportKey("jwk", publicKey) -> send to Worker
  3. Store privateKey CryptoKey in IndexedDB (never exported)

WORKER (broker reply arrives via Email Routing):
  1. importKey("jwk", publicKeyJWK, "RSA-OAEP")
  2. generateKey("AES-GCM", 256) -> symmetricKey
  3. getRandomValues(new Uint8Array(12)) -> iv
  4. encrypt({name:"AES-GCM", iv}, aesKey, emailBytes) -> encryptedBody
  5. exportKey("raw", aesKey) -> encrypt("RSA-OAEP", userPubKey, ...) -> encryptedKey
  6. Store {encryptedBody, encryptedKey, iv} in KV

BROWSER (reading replies):
  1. GET /api/replies/:alias from Worker
  2. Retrieve privateKey from IndexedDB
  3. decrypt("RSA-OAEP", privateKey, encryptedKey) -> aesKeyBytes
  4. importKey("raw", aesKeyBytes, "AES-GCM") -> aesKey
  5. decrypt({name:"AES-GCM", iv}, aesKey, encryptedBody) -> plaintext
```

**Why RSA-OAEP (not ECDH):**
- ECDH is a key *agreement* protocol -- both parties need keypairs. The Worker would need a persistent keypair, creating a key management burden.
- RSA-OAEP is one-way encryption: browser has keypair, Worker only needs the public key. Simpler architecture.
- For a relay where the Worker encrypts *for* the browser to decrypt, RSA-OAEP is the natural fit -- the Worker is an encrypter, not a participant in a handshake.
- RSA-2048 public keys are ~300 bytes as JWK. Stored once per campaign in KV. Not a storage concern.

**Why RSA-2048 (not RSA-4096):**
- Campaigns last 90 days max (GDPR 30-day deadline + follow-up)
- RSA-2048 is secure through 2030+ per NIST SP 800-57
- Key generation is ~4x faster with 2048 vs 4096
- For short-lived campaign keys, 2048 is the right tradeoff

**Why Hybrid (not RSA-only):**
- RSA-OAEP with 2048-bit key can only encrypt ~190 bytes directly
- Email bodies range from 1KB to 1MB+
- AES-GCM handles bulk data with built-in authentication
- This is the standard pattern (PGP, S/MIME, TLS)

**Private key persistence:**
- **Runtime:** CryptoKey object in IndexedDB (serializable, key material stays in browser secure storage)
- **Backup:** Export as JWK, encrypt with user passphrase via PBKDF2 + AES-GCM, include in save file
- **Recovery:** Decrypt JWK from save file with passphrase, import back into IndexedDB

**Workers runtime algorithm support (verified in [official docs](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)):**
- RSA-OAEP: encrypt, decrypt, generateKey, importKey, exportKey -- SUPPORTED
- AES-GCM: encrypt, decrypt, generateKey, importKey, exportKey -- SUPPORTED
- PBKDF2: deriveKey, deriveBits -- SUPPORTED
- SHA-256/384/512: digest -- SUPPORTED
- HMAC: sign, verify -- SUPPORTED

**Confidence: HIGH** -- All algorithms verified in Cloudflare Workers Web Crypto docs and MDN.

### Domain Infrastructure

| Technology | Purpose | Cost | Notes |
|------------|---------|------|-------|
| erasurekit.uk (Cloudflare Registrar) | Email domain for temp addresses | ~$5.30/year | .uk TLD, EU-aligned |
| erasurekit@proton.me | Project contact email | Free | Proton Mail |
| Cloudflare DNS | DNS + Email Routing MX records | Free | Required for Email Routing |
| Resend DNS records | SPF + DKIM + DMARC | Free (DNS entries) | Added to Cloudflare DNS |

---

## Existing Stack (Unchanged from v1.0)

| Technology | Version | Purpose |
|------------|---------|---------|
| Preact | 10.29.0 | UI framework (3KB gzipped) |
| HTM | 3.1.1 | JSX alternative, no build step |
| Preact Signals | 2.9.0 | Reactive state |
| @tailwindcss/browser | 4.x | Dev mode styling |
| @tailwindcss/vite | 4.2.x | Production styling |
| browser-fs-access | 0.38.0 | Save/load to JSON file |
| date-fns | 4.x | Date arithmetic |
| Vite | 7.x | Bundler |
| vite-plugin-singlefile | 2.3.2 | Single HTML output |
| @preact/preset-vite | 2.10.x | Preact + Vite integration |
| Vitest | 4.x | Testing |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Email sending | Resend (raw `fetch`) | Resend Node.js SDK (v6.10.0) | 300KB+ wrapper around one POST call. Raw fetch is 10 lines. No benefit in a Worker. |
| Email sending | Resend (raw `fetch`) | Cloudflare Email Service | Private beta (Sept 2025). No GA date. Requires paid Workers plan ($5/mo). Pricing unfinalized. |
| Email sending | Resend (raw `fetch`) | MailChannels | Ended free Cloudflare partnership. Paid only. |
| Email sending | Resend (raw `fetch`) | SendGrid / Mailgun | More complex setup, heavier SDKs, no eu-west-1 free tier. |
| Email sending | Resend (raw `fetch`) | Amazon SES | Complex IAM setup. Overkill. Resend wraps SES with simpler DX. |
| Email parsing | postal-mime (2.7.3) | mailparser | Maintenance mode. Node.js only. Authors recommend postal-mime for new projects. |
| MIME composition | mimetext (3.0.28) | nodemailer | SMTP/TCP sockets not available in Workers runtime. |
| Storage | Cloudflare KV | Cloudflare D1 (SQLite) | Relational DB is overkill for key-value alias lookups. KV is simpler, faster for this use case. |
| Storage | Cloudflare KV | Cloudflare R2 | Object storage for large files. Email replies are <100KB. KV values go up to 25 MiB. |
| Storage | Cloudflare KV | Durable Objects | Per-alias coordination + WebSockets. Interesting but complex. KV is sufficient and free tier friendly. |
| Encryption | RSA-OAEP + AES-GCM (native) | ECDH P-256 + AES-GCM | ECDH requires both parties to have keypairs. Worker would need persistent key management. RSA-OAEP is simpler: one keypair in browser, public key on server. |
| Encryption | RSA-OAEP + AES-GCM (native) | X25519 + ChaCha20 | Newer, faster, but inconsistent browser support (Chrome 133+). RSA+AES has universal support. |
| Encryption | Web Crypto API (native) | tweetnacl (24KB) | Native API does the same thing with zero bytes added. |
| Encryption | Web Crypto API (native) | libsodium.js (60KB) | Same -- unnecessary dependency. |
| Encryption | Web Crypto API (native) | openpgp.js (200KB+) | Massive library. PGP key management is overkill for 90-day campaign keys. |
| Worker framework | Native fetch handler | Hono / itty-router | 5 endpoints. A switch statement suffices. Zero-dependency Worker. |
| Worker config | wrangler.jsonc | wrangler.toml | jsonc is recommended format for Wrangler v4. Supports comments. Better editor tooling. |
| Worker dev | GitHub Actions + Dashboard | Wrangler local dev | Wrangler 4.x does not support Windows 10. CI runs on Ubuntu. |
| Auth | ECDSA request signing | JWT | JWT requires shared secret. ECDSA uses same keypair as encryption. But for v2.0 MVP, simple alias-based access is sufficient -- defer ECDSA auth to hardening phase. |

---

## What NOT to Add

| Do NOT Add | Why |
|------------|-----|
| `resend` npm package | Raw `fetch()` is 10 lines. 300KB+ saved. |
| `tweetnacl` / `libsodium.js` / `openpgp.js` | Web Crypto API is native. Zero bytes needed. |
| `nodemailer` | SMTP/TCP sockets unavailable in Workers. |
| `hono` / `itty-router` / `express` | 5 endpoints. Native routing is fine. |
| `zod` (in Worker) | Validate in frontend. Worker trusts frontend requests. |
| `mimetext` (v2.0 MVP) | Only needed for auto-replies. Defer. |
| `dotenv` | Wrangler handles env vars natively. |
| Any database ORM | KV is key-value. No ORM. |
| Any auth library | No user accounts. Identity is cryptographic. |
| `uuid` | `crypto.randomUUID()` is native. |

---

## Worker Project Structure

```
erasure-kit/
  src/                          # Existing Preact frontend (unchanged)
  worker/                       # NEW: Cloudflare Worker relay
    wrangler.jsonc              # Worker config (KV bindings, vars)
    package.json                # postal-mime + wrangler
    .dev.vars                   # Local dev secrets (gitignored)
    src/
      index.js                  # Main entry: fetch() + email() handlers
      send.js                   # Resend API integration (raw fetch)
      receive.js                # Email handler: parse + encrypt + store
      crypto.js                 # Web Crypto wrappers (RSA-OAEP + AES-GCM)
      quota.js                  # Rate limit + quota tracking
      cors.js                   # CORS headers for portable frontend
  .github/
    workflows/
      deploy-worker.yml         # GitHub Actions deployment
  dist/                         # Built frontend (unchanged)
  public/
    brokers.json                # Broker database (unchanged)
  package.json                  # Frontend deps (unchanged)
  vite.config.js                # Frontend build (unchanged)
```

---

## Wrangler Configuration

```jsonc
// worker/wrangler.jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "erasurekit-relay",
  "main": "src/index.js",
  "compatibility_date": "2026-04-01",

  "kv_namespaces": [
    {
      "binding": "RELAY_STATE",
      "id": "<production-namespace-id>",
      "preview_id": "<preview-namespace-id>"
    }
  ],

  "vars": {
    "RESEND_API_URL": "https://api.resend.com/emails",
    "RESEND_REGION": "eu-west-1",
    "DOMAIN": "erasurekit.uk",
    "MAX_DAILY_SENDS": "100",
    "MAX_MONTHLY_SENDS": "3000",
    "CAMPAIGN_TTL_DAYS": "90"
  }

  // Secrets (set via `wrangler secret put` or GitHub Actions):
  // RESEND_API_KEY
}
```

**Note:** Catch-all email routing is configured in the **Cloudflare Dashboard** (Email > Email Routing > Routes), NOT in wrangler.jsonc.

---

## Worker Dependencies

```json
{
  "name": "erasurekit-relay",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "deploy": "wrangler deploy",
    "dev": "wrangler dev"
  },
  "dependencies": {
    "postal-mime": "^2.7.3"
  },
  "devDependencies": {
    "wrangler": "^4.79.0"
  }
}
```

**Total: 1 runtime dependency (postal-mime, zero sub-dependencies), 1 dev dependency (wrangler).**

---

## Worker API Surface

| Method | Path | Purpose | KV Operations |
|--------|------|---------|---------------|
| `POST` | `/api/campaign` | Create campaign: store public key, generate temp alias | 1 write |
| `POST` | `/api/send` | Send one erasure email via Resend | 1 read + 1 write (quota) + 1 external fetch |
| `GET` | `/api/status/:alias` | Campaign status: sent/replied per broker | 1 read |
| `GET` | `/api/replies/:alias` | Encrypted replies (browser decrypts) | 1-N reads |
| `GET` | `/api/quota` | Remaining daily/monthly quota | 2 reads |

**CORS:** All responses return `Access-Control-Allow-Origin: *`. The frontend is a portable HTML file served from any origin including `file://` (which sends `Origin: null`). Wildcard `*` covers all cases.

---

## KV Data Model

| Key Pattern | Value (JSON) | TTL |
|-------------|-------------|-----|
| `alias:{alias}` | `{ publicKey: JWK, createdAt, brokers: [{email, sentAt, status}] }` | 90 days |
| `reply:{alias}:{msgId}` | `{ encryptedBody, encryptedKey, iv, from, subject, receivedAt }` | 90 days |
| `quota:{YYYY-MM-DD}` | `{ sent: number }` | 2 days |
| `quota:month:{YYYY-MM}` | `{ sent: number }` | 35 days |

**Limits:**
- Key: max 512 bytes (alias patterns are ~30 bytes -- well within)
- Value: max 25 MiB (encrypted replies are <100KB typically)
- Metadata: max 1,024 bytes per key
- Same-key writes: max 1/second
- Operations per invocation: max 1,000

---

## Frontend Additions (No New Dependencies)

All v2.0 frontend features use native browser APIs:

| Browser API | Purpose | Browser Support |
|-------------|---------|----------------|
| `crypto.subtle` | Keypair generation, encrypt/decrypt | All modern browsers |
| `indexedDB` | Store CryptoKey objects (private keys) | All modern browsers |
| `fetch()` | Worker relay API calls | Already in use |
| `crypto.randomUUID()` | IDs | Already in use |
| `crypto.getRandomValues()` | Generate AES-GCM IVs | All modern browsers |

---

## GitHub Actions Deployment

```yaml
# .github/workflows/deploy-worker.yml
name: Deploy Relay Worker
on:
  push:
    branches: [main]
    paths: ['worker/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: worker
          secrets: |
            RESEND_API_KEY
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
```

---

## Infrastructure Setup Checklist

### Cloudflare (erasurekit.uk)
- [ ] Email Routing enabled (Dashboard: Email > Email Routing)
- [ ] Catch-all route -> Email Worker
- [ ] KV namespace `RELAY_STATE` created
- [ ] Worker deployed
- [ ] `RESEND_API_KEY` set as Worker secret

### Resend
- [ ] Free account created
- [ ] `erasurekit.uk` domain added, region `eu-west-1`
- [ ] SPF + DKIM DNS records added to Cloudflare DNS
- [ ] Domain verified
- [ ] API key generated

### GitHub
- [ ] `CLOUDFLARE_API_TOKEN` in repo secrets
- [ ] `RESEND_API_KEY` in repo secrets
- [ ] `.github/workflows/deploy-worker.yml` committed

### DNS (erasurekit.uk in Cloudflare)
- [ ] MX records for Email Routing (auto-configured)
- [ ] SPF TXT record (from Resend)
- [ ] DKIM CNAME/TXT records (from Resend)
- [ ] DMARC TXT record (`v=DMARC1; p=quarantine`)

---

## Free Tier Budget

| Service | Free Tier | Per Campaign (169 brokers) | Monthly Capacity |
|---------|-----------|---------------------------|-----------------|
| **Resend sends** | 100/day, 3,000/month | 169 emails (2 days) | ~17 campaigns |
| **CF Workers** | 100K req/day | ~200 requests | Massive headroom |
| **CF KV reads** | 100K/day | ~5 per poll | Massive headroom |
| **CF KV writes** | 1K/day | ~170 (campaign creation) | ~5 campaigns/day |
| **CF KV storage** | 1 GB | ~50KB | ~20,000 campaigns |
| **CF Email Routing** | Unlimited | ~169 replies | Unlimited |

**Bottlenecks:** Resend daily limit (100/day) and KV writes (1,000/day). Quota-aware batching spreads sends across days. One campaign takes 2 days to send all 169 brokers.

---

## Sources

### HIGH Confidence (official docs, verified)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) -- Free tier: 100K req/day, 10ms CPU
- [Cloudflare KV limits](https://developers.cloudflare.com/kv/platform/limits/) -- 512B keys, 25MiB values, 1K writes/day
- [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/email-workers/) -- `email(message, env, ctx)` handler
- [Cloudflare Send Email from Workers](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/) -- `cloudflare:email` module, EmailMessage class
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) -- Full algorithm support matrix
- [Cloudflare Wrangler install](https://developers.cloudflare.com/workers/wrangler/install-and-update/) -- OS: Windows 11 only
- [Cloudflare Workers + Resend tutorial](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/) -- Integration, secrets
- [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) -- `wrangler-action@v3`
- [Resend pricing](https://resend.com/pricing) -- 100/day, 3,000/month free
- [Resend CF Workers](https://resend.com/docs/send-with-cloudflare-workers) -- SDK + raw fetch usage
- [Resend domains](https://resend.com/docs/dashboard/domains/introduction) -- SPF/DKIM verification
- [Resend regions](https://resend.com/docs/dashboard/domains/regions) -- eu-west-1 on free plan
- [Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) -- 2 req/sec rate limit
- [postal-mime npm](https://www.npmjs.com/package/postal-mime) -- v2.7.3, zero deps
- [mimetext npm](https://www.npmjs.com/package/mimetext) -- v3.0.28, RFC-5322
- [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) -- Web Crypto API
- [MDN CryptoKeyPair](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKeyPair) -- Serializable to IndexedDB
- [wrangler-action](https://github.com/cloudflare/wrangler-action) -- v3 GitHub Action

### MEDIUM Confidence (multiple sources agree)
- [CF Email Service blog](https://blog.cloudflare.com/email-service/) -- Private beta, no GA date
- [Resend raw fetch](https://nesin.io/blog/send-email-resend-api) -- `POST https://api.resend.com/emails`
- [Wrangler Win10 crash](https://github.com/cloudflare/workers-sdk/issues/11593) -- Confirmed on 10.0.19045
- [E2E encryption patterns](https://dev.to/jrgould/use-the-web-crypto-api-to-generate-a-public-private-key-pair-for-end-to-end-asymmetric-cryptography-on-the-web-2mpe) -- RSA-OAEP + AES-GCM hybrid

### LOW Confidence (needs validation)
- Exact Resend error code at 100/day limit (429? 403?)
- `file://` origin CORS with `Origin: null` in Worker
- KV write burst behavior (multiple campaigns/second)
- IndexedDB CryptoKey persistence across browser updates
- postal-mime handling of malformed broker auto-replies

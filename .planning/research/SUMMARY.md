# Research Summary: ErasureKit v2.0 Relay Architecture

**Domain:** Relay-based email sending/receiving for GDPR erasure automation
**Researched:** 2026-04-01
**Overall confidence:** HIGH
**Supersedes:** v1.0 summary (2026-03-28, mailto: + mail.tm architecture)

## Executive Summary

The v2.0 milestone replaces ErasureKit's mailto:-based sending with a fully automated relay architecture. A Cloudflare Worker acts as a relay that sends emails via the Resend API from temporary `@erasurekit.uk` addresses and receives broker replies via Cloudflare Email Routing. End-to-end encryption ensures the domain owner cannot read user emails stored in Cloudflare KV.

The architecture is built entirely on Cloudflare free tiers plus Resend's free tier. The only cost is the domain (~$5.30/year). Each relay domain provides 100 emails/day and 3,000/month capacity. Scaling is achieved by contributors donating additional domains, each adding another 3,000 emails/month to the relay network.

A **critical development constraint** was discovered: Wrangler 4.x (the Cloudflare Workers CLI) does not support Windows 10, which is the dev machine's OS. Local `wrangler dev` crashes on Windows 10. The mitigation is to use GitHub Actions for deployment, the Cloudflare Dashboard editor for quick iteration, and optionally WSL2 for full local development. This is workable because the Worker is small (~200 lines).

The existing Preact + HTM frontend requires no new npm dependencies. All cryptographic operations use the browser-native Web Crypto API (`crypto.subtle`). The frontend additions are: (1) a relay client module replacing mailto: sending, (2) a crypto module for RSA-OAEP + AES-GCM E2E encryption, (3) IndexedDB storage for CryptoKey objects, and (4) new UI pages for send scheduling, reply monitoring, and quota display.

## Key Findings

**Stack:** Cloudflare Worker + Resend REST API (raw `fetch`, no SDK) + Cloudflare Email Routing + KV storage. Web Crypto API (RSA-OAEP + AES-GCM hybrid) for E2E encryption. postal-mime for inbound email parsing. All free tiers, ~$5.30/year domain cost. Total Worker runtime dependencies: 1 (postal-mime). Total new frontend dependencies: 0.

**Architecture:** Single Worker handles both outbound (Resend API) and inbound (Email Routing catch-all). Per-campaign RSA-OAEP keypair: browser holds private key in IndexedDB, Worker holds public key in KV. Worker encrypts broker replies with user's public key before storing in KV. Frontend decrypts client-side. Domain owner cannot read stored data.

**Critical pitfalls:**
1. **Windows 10 incompatibility** -- Wrangler 4.x local dev is broken on Win10. Must use CI/Dashboard/WSL2.
2. **SMTP plaintext exposure** -- Worker sees email plaintext during the Resend API call (SMTP requires unencrypted content for transit). E2E encryption protects data at rest in KV, not SMTP transit. Must be documented honestly on the About page.
3. **KV write limits** -- 1,000 writes/day on free tier limits campaign creation to ~5/day (each campaign writes ~170 keys). This is the binding infrastructure constraint alongside Resend's 100 sends/day.
4. **10ms CPU limit** -- Workers free tier gives only 10ms CPU per invocation. Email parsing + encryption must complete within this window. postal-mime is fast but large attachments could exceed the limit.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Worker Infrastructure + Crypto Foundation** -- Deploy Worker with basic send capability and crypto helpers
   - Addresses: Wrangler config, KV bindings, RSA-OAEP key generation/import, AES-GCM encrypt, Resend integration, GitHub Actions deploy
   - Avoids: Building frontend against a non-existent backend
   - Risk: Windows 10 dev workflow needs validation

2. **Email Routing (Inbound)** -- Add email handler for receiving broker replies
   - Addresses: Catch-all routing, postal-mime parsing, encrypted storage in KV, reply status tracking
   - Avoids: Coupling send and receive (can test independently)
   - Risk: postal-mime edge cases with diverse broker auto-reply formats

3. **Frontend Relay Client** -- Replace mailto: with relay client + client-side decryption
   - Addresses: relay-client.js, crypto.js (browser-side), IndexedDB for CryptoKey, campaign schema update
   - Avoids: Breaking existing send flow before relay is stable

4. **Send UI + Quota-Aware Batching** -- Calendar scheduling and send progress
   - Addresses: Multi-day batch scheduling (100/day limit), progress visualization, quota display
   - Avoids: Users trying to send 169 brokers in one day

5. **Reply Monitoring + Dashboard** -- Poll, decrypt, classify broker replies
   - Addresses: Background polling, response categorization, compliance deadline tracking, overall stats
   - Avoids: Building reply UI before decryption pipeline works

6. **Scaling + Polish** -- Multi-domain relay registry, contributor flow, privacy docs
   - Addresses: Load balancing across donated domains, About page architecture explanation, legal reference
   - Avoids: Over-engineering scaling before single-domain works

**Phase ordering rationale:**
- Worker must exist before frontend can integrate (dependency)
- Crypto is embedded in the Worker (co-develop, not separate phase)
- Inbound routing depends on deployed Worker with KV
- Frontend relay client depends on stable Worker API
- Send UI depends on relay client being functional
- Reply monitoring depends on email routing being live
- Scaling is polish -- single-domain capacity (3,000/month) serves initial user base

**Research flags for phases:**
- Phase 1: Windows 10 dev workflow (GitHub Actions vs WSL2 vs Dashboard) needs empirical validation
- Phase 1: Resend domain warm-up schedule for new erasurekit.uk domain
- Phase 2: postal-mime handling of multipart/mixed broker auto-replies
- Phase 4: Calendar component design (simple month-grid vs full calendar)
- Phase 5: 10ms CPU limit -- test with large broker reply emails
- Phase 6: Contributor domain onboarding UX (guiding non-technical users through Cloudflare + Resend setup)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All components are GA Cloudflare services with official docs, tutorials, and examples |
| Features | HIGH | Feature set well-defined in PROJECT.md v2.0. Competitive analysis complete from v1.0 research. |
| Architecture | HIGH | RSA-OAEP + AES-GCM is textbook hybrid encryption. Worker + KV + Email Routing is standard CF pattern. |
| Pitfalls | HIGH | Free tier limits documented with exact numbers. Trust boundary understood. Windows 10 issue confirmed. |
| Dev Workflow | MEDIUM | Win10 mitigation (CI + Dashboard) is sound in theory but untested empirically |
| Deliverability | MEDIUM | Custom domain avoids disposable blocklists, but new domain needs warm-up |
| E2E Encryption | MEDIUM | Crypto is standard, but key loss UX needs careful design (user loses save file = unrecoverable) |
| Scaling | LOW | Multi-domain relay registry is designed but untested. Defer to Phase 6. |

## Gaps to Address

- **Resend error handling** -- Exact HTTP status at 100/day limit (429? 403?) needs validation
- **Domain warm-up** -- New domains start with low sender reputation. Optimal ramp-up schedule unknown.
- **`file://` origin CORS** -- Frontend served as a local file sends `Origin: null`. Verify Worker handles this.
- **Key loss recovery** -- If user loses campaign file + IndexedDB, replies are unrecoverable. UX must warn clearly.
- **10ms CPU budget** -- Large broker emails with attachments may exceed free tier CPU limit. Needs testing.
- **DMARC reporting** -- Set up aggregate reports to monitor deliverability. Start with `p=none`.
- **Offline queue sync** -- Queue lives in local save file, Worker KV may differ. Need conflict resolution.
- **Cloudflare Email Service beta** -- Monitor for GA. Could replace Resend (native binding, no API key).

## Sources

All sources documented with confidence levels in STACK.md (30+ verified sources).

### HIGH Confidence
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/email-workers/)
- [Cloudflare Workers Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- [Cloudflare Wrangler install](https://developers.cloudflare.com/workers/wrangler/install-and-update/) -- Windows 11 only
- [Resend + Workers tutorial](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/)
- [Resend pricing](https://resend.com/pricing) -- 100/day, 3,000/month free
- [Resend regions](https://resend.com/docs/dashboard/domains/regions) -- eu-west-1 on free plan
- [postal-mime npm](https://www.npmjs.com/package/postal-mime) -- v2.7.3
- [MDN SubtleCrypto](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
- [wrangler-action](https://github.com/cloudflare/wrangler-action) -- GitHub Actions deployment

### MEDIUM Confidence
- [CF Email Service beta](https://blog.cloudflare.com/email-service/) -- Potential Resend replacement
- [Wrangler Win10 crash](https://github.com/cloudflare/workers-sdk/issues/11593) -- Confirmed

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*

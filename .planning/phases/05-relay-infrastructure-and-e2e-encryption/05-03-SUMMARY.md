---
phase: 05-relay-infrastructure-and-e2e-encryption
plan: "03"
subsystem: infrastructure
tags: [cloudflare, resend, deployment, dns, kv, wrangler]

# Dependency graph
requires:
  - phase: 05-relay-infrastructure-and-e2e-encryption (plan 01)
    provides: Worker source code, route handlers, tests
  - phase: 05-relay-infrastructure-and-e2e-encryption (plan 02)
    provides: Browser crypto module, campaign schema v3
provides:
  - Live Worker at api.erasurekit.uk accepting POST /send and DELETE /address
  - Resend domain verified (erasurekit.uk, eu-west-1)
  - KV namespace bound (erasurekit-relay)
  - RESEND_API_KEY set as wrangler secret
affects: [06-frontend-sending-integration, 07-reply-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [wrangler deploy, cloudflare custom domain routing]

key-files:
  created: []
  modified:
    - worker/wrangler.jsonc

key-decisions:
  - "Used existing Resend 'Onboarding' API key (Sending access) rather than creating a new one"
  - "DNS records auto-provisioned by Resend+Cloudflare integration — no manual DNS needed"
  - "KV namespace ID: f6a2c44dd2844401b651d24ff0a32a3f"

patterns-established:
  - "Worker deployment via npx wrangler deploy from worker/ directory"
  - "Secrets set via npx wrangler secret put (never in code or chat)"

requirements-completed: [RELAY-01, RELAY-02]

# Metrics
duration: 15min
completed: 2026-04-04
---

# Phase 5 Plan 03: Deploy and Verify Summary

**Worker deployed to api.erasurekit.uk with verified Resend domain, KV namespace, and API secret**

## Performance

- **Duration:** 15 min (includes human action for dashboard setup)
- **Completed:** 2026-04-04
- **Tasks:** 2 (1 checkpoint + 1 deployment)

## Accomplishments
- Resend domain erasurekit.uk verified with auto-provisioned DNS records (SPF, DKIM, MX)
- Cloudflare KV namespace `erasurekit-relay` created and bound to Worker
- RESEND_API_KEY set as wrangler secret (never exposed in code or chat)
- Worker deployed to api.erasurekit.uk (custom domain routing, 7.16 KiB, gzip 2.31 KiB)
- Live verification: POST /send returns structured validation errors, unknown routes return 404

## Task Commits

1. **Task 1: Human action** — DNS/Resend/KV dashboard setup (no commit — external dashboards)
2. **Task 2: Deploy + verify** — `3bbbaff` (config)

## Verification

- `curl https://api.erasurekit.uk/nonexistent` → 404 (correct routing)
- `curl -X POST https://api.erasurekit.uk/send -d '{}'` → `{"success":false,"error":{"code":"INVALID_PAYLOAD",...}}` (structured JSON errors working)

## Deviations from Plan

### Auto-fixed Issues

**1. DNS records auto-provisioned**
- **Found during:** Task 1 (human action)
- **Issue:** Plan expected manual DNS record creation, but Resend auto-added SPF, DKIM, and MX records via Cloudflare integration
- **Fix:** Skipped manual DNS steps — verified records were already present in Cloudflare DNS dashboard

**2. Existing Resend API key reused**
- **Found during:** Task 1 (human action)
- **Issue:** Plan expected creating a new API key, but an existing "Onboarding" key with Sending access was available
- **Fix:** Reused existing key — same permissions needed

## Self-Check: PASSED

Worker responds to HTTP requests at api.erasurekit.uk. Structured JSON responses confirmed. KV namespace bound.

---
*Phase: 05-relay-infrastructure-and-e2e-encryption*
*Completed: 2026-04-04*

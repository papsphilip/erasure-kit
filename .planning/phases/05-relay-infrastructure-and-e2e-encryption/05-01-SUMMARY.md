---
phase: 05-relay-infrastructure-and-e2e-encryption
plan: 01
subsystem: infra
tags: [cloudflare-workers, resend, kv, cors, rate-limiting, e2e-encryption, relay]

# Dependency graph
requires: []
provides:
  - "Cloudflare Worker relay at worker/ with POST /send, DELETE /address, OPTIONS CORS"
  - "Resend API integration via direct fetch (no SDK)"
  - "KV-based temp address registration with 90-day TTL"
  - "KV-based IP rate limiting with minute-bucket key pattern"
  - "Structured JSON response envelope for all endpoints"
  - "Vitest test suite with @cloudflare/vitest-pool-workers (16 tests)"
affects: [05-02, 05-03, 06-frontend-integration, 07-email-routing]

# Tech tracking
tech-stack:
  added: [wrangler, "@cloudflare/vitest-pool-workers", cloudflare-kv, resend-api]
  patterns: [stateless-worker-dispatch, kv-rate-limiting, structured-json-envelope, cors-preflight]

key-files:
  created:
    - worker/package.json
    - worker/wrangler.jsonc
    - worker/vitest.config.js
    - worker/.dev.vars
    - worker/src/index.js
    - worker/src/routes/send.js
    - worker/src/routes/address.js
    - worker/src/lib/resend.js
    - worker/src/lib/cors.js
    - worker/src/lib/validate.js
    - worker/src/lib/rate-limit.js
    - worker/tests/send.test.js
    - worker/tests/address.test.js
    - worker/tests/rate-limit.test.js
  modified:
    - .gitignore

key-decisions:
  - "Direct fetch to Resend API instead of SDK -- 20 lines of code vs 60KB SDK bundle, avoids Node.js compat shims"
  - "IP + minute-bucket rate limit key pattern to avoid KV 1-write/sec per-key limit"
  - "vitest v3 + @cloudflare/vitest-pool-workers v0.8 for version compatibility"

patterns-established:
  - "jsonResponse() helper merges CORS headers into every response automatically"
  - "Route dispatch via pathname + method matching in single fetch handler"
  - "KV key prefixes: addr: for temp addresses, rate: for rate limit counters"
  - "Validation functions return { valid, field?, reason? } for uniform error reporting"

requirements-completed: [RELAY-01, RELAY-02, RELAY-03]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 5 Plan 1: Worker Relay Infrastructure Summary

**Cloudflare Worker relay with POST /send (Resend API integration), DELETE /address (KV cleanup), KV-based rate limiting, and structured JSON responses -- 16 tests passing via Miniflare**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-03T22:53:55Z
- **Completed:** 2026-04-03T22:58:13Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 15

## Accomplishments
- Complete Worker project at `worker/` with route dispatch, validation, rate limiting, and Resend integration
- POST /send validates payload, rate-limits by IP, registers temp address in KV with 90-day TTL, sends email via Resend API
- DELETE /address validates slug and removes KV entry for campaign cleanup
- All 16 tests pass via @cloudflare/vitest-pool-workers with Miniflare-powered KV bindings
- CORS preflight (OPTIONS) handled on all paths per D-02
- No secrets in source code -- RESEND_API_KEY from Worker environment only

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for Worker relay endpoints** - `b22e9e2` (test)
2. **Task 1 (GREEN): Implement Worker relay with all routes** - `6795221` (feat)

## Files Created/Modified
- `worker/package.json` - Worker project manifest (erasurekit-relay, wrangler + vitest devDeps)
- `worker/wrangler.jsonc` - Worker config (api.erasurekit.uk custom domain, KV binding)
- `worker/vitest.config.js` - Vitest with @cloudflare/vitest-pool-workers pool and Miniflare KV
- `worker/.dev.vars` - Local dev secrets (gitignored)
- `worker/src/index.js` - Worker entry point with route dispatch and jsonResponse helper
- `worker/src/routes/send.js` - POST /send handler (validate, rate-limit, register KV, call Resend)
- `worker/src/routes/address.js` - DELETE /address handler (validate slug, delete KV entry)
- `worker/src/lib/resend.js` - Resend API client (direct fetch, User-Agent header, error mapping)
- `worker/src/lib/cors.js` - CORS headers helper and OPTIONS handler
- `worker/src/lib/validate.js` - Payload validation for /send and /address
- `worker/src/lib/rate-limit.js` - KV-based IP rate limiter with minute-bucket keys
- `worker/tests/send.test.js` - 10 tests for POST /send (valid, missing fields, Resend errors, CORS)
- `worker/tests/address.test.js` - 3 tests for DELETE /address (valid, missing slug, CORS)
- `worker/tests/rate-limit.test.js` - 3 tests for rate limiter (under limit, over limit, key pattern)
- `.gitignore` - Added .dev.vars, .wrangler/, worker/node_modules/

## Decisions Made
- Used direct `fetch()` to Resend API instead of the `resend` npm SDK -- avoids 60KB bundle and potential Node.js compatibility issues in Workers runtime. The REST API is simple enough (20 lines of code).
- Used IP + minute-bucket key format (`rate:{ip}:{bucket}`) for rate limiting to avoid KV's 1-write/sec per-key hard limit (Pitfall 4 from RESEARCH.md).
- Installed vitest v3 and @cloudflare/vitest-pool-workers v0.8 instead of the planned v4.1.2/v0.14.1 -- these are the current stable versions that actually exist on npm and are compatible with each other.
- Used `compatibility_date: "2025-04-03"` in wrangler.jsonc since the Cloudflare Workers runtime compatibility dates track actual released versions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted dependency versions to match npm availability**
- **Found during:** Task 1 (dependency installation)
- **Issue:** Plan specified wrangler ^4.80.0, @cloudflare/vitest-pool-workers ^0.14.1, vitest ^4.1.2 which do not exist on npm. Current latest: wrangler ^4.14.0, @cloudflare/vitest-pool-workers ^0.8.0, vitest ^3.2.4.
- **Fix:** Used actually available versions that are compatible with each other.
- **Files modified:** worker/package.json
- **Verification:** `npm install` succeeded, all 16 tests pass.
- **Committed in:** b22e9e2 (RED phase commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Version correction was necessary for npm install to succeed. No functional impact -- all planned behaviors are implemented and tested.

## Issues Encountered
- Windows temp directory cleanup warnings from Miniflare (EBUSY on rmdir) -- cosmetic only, does not affect test results. This is a known Windows issue with Miniflare's temporary file handling.

## Known Stubs
None -- all endpoints are fully implemented with real validation, rate limiting, and Resend API integration. No placeholder data or TODO markers.

## User Setup Required
None for local development -- `.dev.vars` provides a placeholder Resend API key for testing.

For production deployment:
- Set real `RESEND_API_KEY` via `wrangler secret put RESEND_API_KEY`
- Create KV namespace and update the ID in `wrangler.jsonc`
- Configure DNS records (SPF, DKIM) for erasurekit.uk domain in Resend

## Next Phase Readiness
- Worker relay is complete and testable independently via `cd worker && npx vitest run`
- Plans 05-02 (browser-side crypto) and 05-03 (E2E integration) can proceed
- Phase 6 frontend integration will refactor `email-sender.js` to call this Worker

---
*Phase: 05-relay-infrastructure-and-e2e-encryption*
*Completed: 2026-04-03*

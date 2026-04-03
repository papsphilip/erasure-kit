---
phase: 5
slug: relay-infrastructure-and-e2e-encryption
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + @cloudflare/vitest-pool-workers 0.14.1 |
| **Config file** | `worker/vitest.config.js` (Wave 0 — does not exist yet) |
| **Quick run command** | `cd worker && npx vitest run` |
| **Full suite command** | `cd worker && npx vitest run && cd .. && npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd worker && npx vitest run`
- **After every plan wave:** Run `cd worker && npx vitest run && cd .. && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | RELAY-01 | integration | `cd worker && npx vitest run tests/send.test.js -t "sends email"` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | RELAY-02 | unit | `cd worker && npx vitest run tests/address.test.js -t "register"` | ❌ W0 | ⬜ pending |
| 05-01-03 | 01 | 1 | RELAY-03 | unit | `cd worker && npx vitest run tests/send.test.js -t "response format"` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | E2EE-01 | unit | `npx vitest run src/lib/crypto.test.js -t "key generation"` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | E2EE-02 | unit | `npx vitest run src/lib/crypto.test.js -t "encrypt"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `worker/package.json` — Worker project manifest with wrangler + vitest deps
- [ ] `worker/vitest.config.js` — Vitest config with @cloudflare/vitest-pool-workers
- [ ] `worker/tests/send.test.js` — POST /send handler tests (success, validation, Resend errors)
- [ ] `worker/tests/address.test.js` — DELETE /address and KV registration tests
- [ ] `worker/tests/rate-limit.test.js` — Rate limiter unit tests
- [ ] `src/lib/crypto.js` — Browser-side crypto module
- [ ] `src/lib/crypto.test.js` — Key generation, encrypt, decrypt round-trip tests
- [ ] `.gitignore` update — Add `.dev.vars`, `.wrangler/` entries

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real email delivery via Resend | RELAY-01 | Requires live Resend API call with verified domain | Deploy Worker, call POST /send with real payload, check recipient inbox |
| DNS/domain verification | RELAY-01 | One-time Cloudflare + Resend setup | Verify SPF + DKIM records, confirm Resend domain status is "verified" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

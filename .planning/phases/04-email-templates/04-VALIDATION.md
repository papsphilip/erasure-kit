---
phase: 4
slug: email-templates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 with jsdom + @preact/preset-vite |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | TMPL-01 | unit | `npx vitest run src/lib/template-engine.test.js` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | TMPL-02 | unit | `npx vitest run src/lib/template-engine.test.js` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | TMPL-03 | unit | `npx vitest run src/lib/template-engine.test.js` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 1 | TMPL-04 | unit | `npx vitest run src/lib/template-engine.test.js` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 2 | TMPL-05 | manual | Browser: click broker → verify sidebar shows preview | N/A | ⬜ pending |
| 04-02-02 | 02 | 2 | TMPL-06 | unit | `npx vitest run src/lib/clipboard.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/template-engine.test.js` — stubs for TMPL-01 through TMPL-04
- [ ] `src/lib/clipboard.test.js` — stubs for TMPL-06 clipboard fallback

*Existing vitest infrastructure (vitest.config.js, jsdom environment) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Broker sidebar opens with preview | TMPL-05 | Visual UI interaction | Click broker row → verify right sidebar slides in with To/Subject/Body |
| Expandable drawer shows base template | TMPL-05 | Visual UI interaction | Click drawer toggle → verify general template is visible |
| Editable textarea persists edits | TMPL-05 | UI + persistence integration | Edit template text → navigate away → return → verify edits preserved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

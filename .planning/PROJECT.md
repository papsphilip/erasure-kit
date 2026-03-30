# ErasureKit

## What This Is

A free, open-source portable web app that automates GDPR Article 17 data erasure requests for Europeans. Users enter minimal identity info, the app creates a temporary email address, sends legally-compliant erasure requests to all known data brokers in one click, monitors responses, tracks 30-day compliance deadlines, and flags overdue brokers. Once all brokers respond, the temp email is deleted. No servers, no accounts, no tracking — everything runs in the browser.

## Core Value

One-click automated data erasure across all known brokers without exposing the user's real email address.

## Requirements

### Validated

- [x] Separate `brokers.json` file — user-editable, community-expandable, imported by the app *(Validated in Phase 1: App Shell and Distribution)*
- [x] Single portable HTML file via Vite + vite-plugin-singlefile *(Validated in Phase 1)*
- [x] Zero build-step dev mode with CDN-loaded modules *(Validated in Phase 1)*
- [x] Minimal identity input: name + email(s) to erase. Optional: phone, address *(Validated in Phase 2: Identity Input and Persistence)*
- [x] Save/load progress to local JSON file via File System API *(Validated in Phase 2)*
- [x] Comprehensive broker database compiled from all open-source GitHub broker lists (100+ brokers) *(Validated in Phase 3: Broker Database)*
- [x] Region-aware email templates (strict GDPR for UK/EU, CCPA/broader for US brokers) *(Validated in Phase 4: Email Templates)*

### Active

- [ ] Auto-create temporary email address via free API (mail.tm or equivalent) — no user setup
- [ ] Send GDPR Article 17 erasure requests to all selected brokers from the temp email in one click
- [ ] Fully automated email monitoring — poll temp inbox for broker responses
- [ ] Track 30-day GDPR compliance deadline per broker
- [ ] Detect and categorize broker responses (confirmation, rejection, request for more info)
- [ ] Notify user when brokers are overdue (past 30-day deadline)
- [ ] Pre-filled escalation templates for overdue brokers (follow-up warning + DPA complaint)
- [ ] Delete temp email account after all brokers have responded
- [ ] Legal reference page: full GDPR Article 17 text with plain-English explanations
- [ ] Legal reference page: identity verification guide (what to share, how to push back)
- [ ] Legal reference page: country-specific Data Protection Authorities with complaint links
- [ ] Legal reference page: escalation email templates and DPA complaint letters
- [ ] Dashboard showing overall stats: sent, responded, overdue, completed
- [ ] Per-broker status tracking: pending → sent → awaiting response → completed/escalated

### Out of Scope

- Hosting / SaaS deployment — this is a standalone portable app
- User accounts / authentication — zero tracking, zero server
- Multi-language i18n — English only for v1, community adds later
- Native desktop app (Electron/Tauri) — portable web app only
- Self-hosted email server — uses free third-party temp email API
- Automated DPA complaint filing — app generates templates, user files manually
- Sending from user's real email — the whole point is protecting their real address

## Context

- Reference material and initial React prototype in `helpers/erasure-kit.md` (Virgo monorepo)
- GDPR Article 17 gives EU/UK residents a legally enforceable right to erasure — companies must respond within 30 days
- Identity verification is conditional (Art. 12(6)) — companies can only request proportionate verification, not excessive documents
- Existing open-source broker databases on GitHub: yaelwrites/big-ass-data-broker-opt-out-list, The Markup dataset, Vermont/California registries, JustVanish, DataBrokerOptOut
- Distribution model: share with friends for testing → release on GitHub as open-source project
- No hosting infrastructure — the app is a single portable bundle users open in their browser
- mail.tm offers a free REST API for creating/reading/deleting temporary email accounts programmatically

## Constraints

- **No server**: Must work entirely client-side. All API calls (temp email, etc.) from browser.
- **Free APIs only**: Temp email service must be free, no API keys needed for basic usage.
- **CORS**: Temp email API must allow browser-origin requests, or we need a workaround.
- **Portable**: Single HTML/JS bundle or small set of static files. No build step for end users.
- **Privacy**: App must never phone home, track users, or store data externally.
- **Legal accuracy**: Email templates must cite correct GDPR articles and use legally appropriate language.
- **File System API**: For local save/load — only works in Chromium browsers (Chrome, Edge, Brave). Fallback: download/upload JSON.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Portable web app (not desktop) | No install friction, share via link/file, works everywhere | Validated (Phase 1) |
| Preact + HTM (not React) | 3KB gzipped, no build step needed for dev, CDN-loadable | Validated (Phase 1) |
| Temp email via mail.tm API | Free, no API key, REST API, supports create/read/delete | — Pending |
| Separate brokers.json file | Community can contribute brokers via GitHub PRs without touching app code | Validated (Phase 1) |
| Local file storage (not localStorage) | Users can backup, transfer, and inspect their progress data | Validated (Phase 2) |
| English only for v1 | Ship fast, i18n framework can be added later for community translations | — Pending |
| Minimal identity (name + emails) | GDPR data minimization — only share what brokers need to find records | Validated (Phase 2) |
| Wizard stepper navigation | 4 steps with free jumping, secondary screens in hamburger menu | Validated (Phase 1) |
| Privacy blue-gray palette | Trust/security aesthetic, dark+light mode with toggle | Validated (Phase 1) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after Phase 4 completion*

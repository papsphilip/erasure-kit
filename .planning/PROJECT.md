# ErasureKit

## What This Is

A free, open-source GDPR Article 17 data erasure tool for Europeans. Users enter minimal identity info, click "Send All", and the app automatically sends legally-compliant erasure requests to all selected data brokers via a relay network. Each user gets a random temporary email address (e.g. `a7k9x@erasurekit.uk`) so their real email is never exposed to brokers. The app monitors broker responses, tracks 30-day compliance deadlines, and flags overdue brokers. Everything is end-to-end encrypted — even the domain owner cannot read user emails.

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

### Active (v2.0 — Relay-Based Email Architecture)

- [ ] Cloudflare Worker relay that sends emails via Resend API from temp `@erasurekit.uk` addresses
- [ ] "Send All" button that dispatches all selected brokers in automated batches
- [ ] Quota-aware batching with calendar UI showing send schedule across days
- [ ] Relay registry with load balancing across contributor-donated domains
- [ ] End-to-end encryption — domain owner cannot read user emails
- [ ] Automatic reply monitoring via Cloudflare Email Routing
- [ ] Campaign resume across sessions (queued emails pick up automatically)
- [ ] Contributor donation flow — $2/year domain to increase relay capacity
- [ ] Privacy transparency on About page — full architecture explanation
- [ ] Track 30-day GDPR compliance deadline per broker
- [ ] Detect and categorize broker responses (confirmation, rejection, request for more info)
- [ ] Notify user when brokers are overdue (past 30-day deadline)
- [ ] Pre-filled escalation templates for overdue brokers (follow-up warning + DPA complaint)
- [ ] Legal reference page: GDPR Article 17 text, identity verification guide, DPA directory
- [ ] Dashboard showing overall stats: sent, responded, overdue, completed

### Out of Scope

- User accounts / authentication — zero tracking, no signup
- Multi-language i18n — English only for v2, community adds later
- Native desktop app (Electron/Tauri) — portable web app only
- Automated DPA complaint filing — app generates templates, user files manually
- Sending from user's real email — the whole point is protecting their real address
- mailto: links — replaced by relay-based sending in v2.0

## Context

- Reference material and initial React prototype in `helpers/erasure-kit.md` (Virgo monorepo)
- GDPR Article 17 gives EU/UK residents a legally enforceable right to erasure — companies must respond within 30 days
- Identity verification is conditional (Art. 12(6)) — companies can only request proportionate verification, not excessive documents
- Existing open-source broker databases on GitHub: yaelwrites/big-ass-data-broker-opt-out-list, The Markup dataset, Vermont/California registries, JustVanish, DataBrokerOptOut
- Distribution model: share with friends for testing → release on GitHub as open-source project
- v1.0 delivered: app shell, identity input, broker database (169 brokers), email templates, status tracking, notification system, demo mode
- v2.0 replaces mailto: with relay-based sending via Cloudflare Worker + Resend

### Infrastructure (v2.0)

- **Domain:** erasurekit.uk (Cloudflare Registrar, ~$5.30/year)
- **Project email:** erasurekit@proton.me
- **Sending:** Resend API (eu-west-1, free tier: 100/day, 3,000/month)
- **Receiving:** Cloudflare Email Routing (free, unlimited)
- **Worker:** Cloudflare Workers (free tier: 100K requests/day)
- **Storage:** Cloudflare KV (free tier: 100K reads/day, 1K writes/day)
- **Scaling:** Contributors donate $2/year domains, each adds 3,000 emails/month

## Constraints

- **Minimal server**: Cloudflare Worker relay only — no traditional server, no database server
- **Free tiers**: All infrastructure uses free tiers (Cloudflare Workers, KV, Email Routing, Resend)
- **Portable frontend**: Single HTML/JS bundle, no build step for end users
- **Privacy**: End-to-end encrypted — domain owner cannot read user emails. No tracking, no analytics
- **Legal accuracy**: Email templates must cite correct GDPR articles and use legally appropriate language
- **File System API**: For local save/load — Chromium browsers. Fallback: download/upload JSON

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Portable web app (not desktop) | No install friction, share via link/file, works everywhere | Validated (Phase 1) |
| Preact + HTM (not React) | 3KB gzipped, no build step needed for dev, CDN-loadable | Validated (Phase 1) |
| Temp email via mail.tm API | Free, no API key, REST API, supports create/read/delete | Superseded by relay architecture (v2.0) |
| Relay-based sending via Cloudflare Worker + Resend | Automated sending from @erasurekit.uk, no mailto:, no user email exposure | — v2.0 |
| erasurekit.uk domain | $5.30/year, Cloudflare Registrar, EU region for GDPR alignment | — v2.0 |
| E2E encryption for user emails | User's browser holds decryption key, domain owner cannot read | — v2.0 |
| Contributor relay scaling | Each donated domain adds 3,000 emails/month capacity | — v2.0 |
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

## Current Milestone: v2.0 Relay-Based Email Architecture

**Goal:** Replace mailto: with fully automated email sending via a distributed Cloudflare Worker relay network, giving every user a free temporary email address with E2E encrypted response monitoring.

**Target features:**
- Cloudflare Worker relay (send via Resend API + receive via Email Routing)
- "Send All" with quota-aware batching and calendar schedule UI
- E2E encryption — domain owner cannot read user emails
- Automatic reply monitoring and campaign resume across sessions
- Contributor relay donation flow for scaling
- Privacy transparency documentation
- Legal reference pages and escalation templates

---
*Last updated: 2026-04-01 — Milestone v2.0 started*

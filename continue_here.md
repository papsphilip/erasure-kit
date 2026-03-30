---
scope: tools/erasure-kit
status: paused
phase: "Phase 5 discuss in progress — 2 of 4 areas done (Send layout, Batch UX)"
gsd_command: "gsd:discuss-phase 5"
last_updated: "2026-03-30"
---

# Continue Here — ErasureKit

## Resume Instructions

Phase 5 discuss-phase is **halfway done**. Two areas captured, two remaining.

**Next step:** `/gsd:discuss-phase 5` — when prompted that context exists, choose "Update it". Then discuss the remaining two areas:
1. **Campaign dashboard** — where the progress dashboard lives, what stats/visuals it shows
2. **Status lifecycle** — how statuses transition, overdue flags, manual status changes

The WIP context file is at `.planning/phases/05-sending-and-status-tracking/05-CONTEXT-WIP.md` — read it to see decisions captured so far (D-01 through D-12).

## What's Built

- Preact + HTM app shell with 4-step wizard stepper (Identity, Brokers, Send, Track)
- Two-mode architecture: zero-build dev (open index.html) + Vite single-file build
- Dark/light theme toggle with privacy blue-gray palette
- Welcome screen with Resume Campaign / Start New / Load from file for returning users
- Hamburger menu with Home, Legal Reference, Escalation, About
- Header title clickable as Home button, Home link in footer
- Sticky header, stepper, and broker search toolbar
- Production build: `dist/Erasure-Kit/` folder (erasure-kit.html + brokers.json + README.md)
- Signal-based routing, theme, and campaign state management
- Identity form: name, multi-email list, collapsible phone/address, inline validation
- Campaign persistence: Save/Load buttons in header, localStorage auto-save, browser-fs-access file save/load
- 169 brokers in brokers.json covering EU/EEA, UK, US, Other regions
- Broker table with search, filter, sort, select/deselect, expandable rows
- Template engine: 3 region-specific generators (GDPR, UK-GDPR, CCPA) with full legal citations
- Campaign schema v2 with per-broker template storage
- Template UI: expandable drawer at top of Brokers page, right sidebar for per-broker preview/edit
- Clipboard copy with "Copied!" fade confirmation, reset-to-default
- 63 unit tests passing (Vitest + jsdom)

## Context

- Free, open-source GDPR Article 17 erasure automation tool
- Portable web app (single HTML file, Preact + HTM + Vite)
- 8 phases, 46 requirements — Phases 1-4 done, 4 remaining
- GitHub repo: papsphilip/erasure-kit (public)
- Key finding: mail.tm is receive-only — sending via mailto: links
- Separate brokers.json compiled from open-source GitHub broker lists

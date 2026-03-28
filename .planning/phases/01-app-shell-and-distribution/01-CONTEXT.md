# Phase 1: App Shell and Distribution - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate the Preact + HTM + Vite architecture with two-mode dev/build workflow. Deliver a working app shell with wizard-style navigation, visual identity, welcome screen, and production build that outputs a distributable `Erasure-Kit/` folder containing a single HTML file + brokers.json + README.md.

Requirements: DIST-01 (single HTML build), DIST-02 (zero build-step dev mode), DIST-03 (separate brokers.json).

</domain>

<decisions>
## Implementation Decisions

### Navigation Pattern
- **D-01:** Wizard/stepper layout with 4 top-level steps: Identity, Brokers, Send, Track (Monitor)
- **D-02:** Free jumping — all steps clickable from the start, no locked linear progression
- **D-03:** Visual progress indicators — completed steps get checkmark/filled state, current step highlighted, future steps dimmed
- **D-04:** Secondary screens (Legal Reference, Escalation, About) live in a hamburger menu, with additional contextual links within relevant steps and footer links for discoverability
- **D-05:** Responsive from the start — stepper adapts to mobile viewports

### Visual Identity
- **D-06:** Both dark and light mode with a toggle. Dark mode as default.
- **D-07:** Privacy blue-gray color palette: Primary #0EA5E9 (sky blue), Accent #06B6D4 (cyan), Surface #1E293B (slate-800 dark) / inverted for light mode, Success #22C55E, Warning #F59E0B, Danger #EF4444
- **D-08:** Light mode is a standard inversion — same accent colors on white/light-gray surfaces
- **D-09:** System font stack (-apple-system, Segoe UI, etc.) — zero font loading, smallest bundle
- **D-10:** Text-only branding for v1 — just "ErasureKit" in the header, no logo
- **D-11:** Medium rounded corners — rounded-lg (8px) for buttons, rounded-xl (12-16px) for cards

### Landing Experience
- **D-12:** Welcome screen with quick-start content: brief explanation of what the app does (3-4 bullet points), "Get Started" button navigating to Step 1 (Identity)
- **D-13:** Auto-detect localStorage for returning users — if cached campaign exists, show "Resume Campaign" instead of "Get Started"
- **D-14:** Brief inline privacy statement at bottom: "No data leaves your browser. No accounts. No tracking."
- **D-15:** About page accessible from hamburger menu

### Distribution
- **D-16:** Production HTML file named `erasure-kit.html`
- **D-17:** Full branding meta tags: title "ErasureKit — GDPR Data Erasure Tool", description meta, Open Graph tags for social previews
- **D-18:** Emoji favicon using shield emoji (🛡️) via inline SVG text trick
- **D-19:** Distribution as a folder named `Erasure-Kit/` containing erasure-kit.html + brokers.json + README.md
- **D-20:** Vite build outputs directly to `dist/Erasure-Kit/` ready for zip and share
- **D-21:** README.md (markdown) included in distribution folder

### Claude's Discretion
- HTML structure for no-build dev mode (import maps, ES module scripts, CDN URLs)
- Vite configuration details for single-file output + Erasure-Kit/ folder structure
- Stepper component implementation approach
- Dark/light mode toggle mechanism (CSS custom properties, Tailwind dark: variant, etc.)
- brokers.json loading strategy (fetch in both dev and prod modes)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Tech Stack & Architecture
- `CLAUDE.md` — Full technology stack specification (Preact 10.29.0, HTM 3.1.1, Vite 7.x, vite-plugin-singlefile, Tailwind v4, browser-fs-access, two-mode architecture)
- `helpers/erasure-kit.md` (Virgo monorepo root) — Reference material and initial React prototype

### Requirements
- `.planning/REQUIREMENTS.md` — DIST-01, DIST-02, DIST-03 requirements for this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependencies

### Project Context
- `.planning/PROJECT.md` — Constraints (no server, free APIs only, CORS, portable, privacy, legal accuracy, File System API)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, empty codebase

### Established Patterns
- None — patterns will be established by this phase

### Integration Points
- brokers.json — must be loadable at runtime in both dev mode (direct file open) and production mode (single-file build)
- localStorage — for auto-save/resume detection on welcome screen (Phase 2 implements full persistence, but Phase 1 shell should be aware of the pattern)

</code_context>

<specifics>
## Specific Ideas

- Stepper visual: numbered circles (1-4) connected by lines, with fill/check states
- Welcome screen layout matches the ASCII mockup discussed: centered content, bullet list of steps, CTA button, privacy statement at bottom
- Hamburger menu contains: Legal Reference, Escalation, About page
- The distribution folder `Erasure-Kit/` is the zip-ready artifact — no post-build assembly needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-app-shell-and-distribution*
*Context gathered: 2026-03-28*

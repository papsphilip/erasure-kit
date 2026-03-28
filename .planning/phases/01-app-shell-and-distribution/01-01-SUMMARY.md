---
phase: 01-app-shell-and-distribution
plan: 01
subsystem: infra
tags: [preact, vite, tailwind, singlefile, esm-cdn, import-maps]

# Dependency graph
requires:
  - phase: none
    provides: first phase, no dependencies
provides:
  - package.json with Preact + Vite 7 + vite-plugin-singlefile build pipeline
  - Dev-mode index.html with CDN import maps (esm.sh Preact/HTM/Signals)
  - Production styles.css with Tailwind v4 custom variant and theme tokens
  - Vite config outputting dist/Erasure-Kit/ with rename-html plugin
  - Signal-based theme toggle (dark/light) with localStorage persistence
  - Dual-mode brokers.json loader (fetch + file:// fallback)
  - Signal-based page router with step completion tracking
  - Seed brokers.json and distribution README.md
affects: [01-02, 02, 03, 04, 05, 06, 07, 08]

# Tech tracking
tech-stack:
  added: [preact@10.29.0, "@preact/signals@2.9.0", vite@7.3.1, "@preact/preset-vite@2.10.5", vite-plugin-singlefile@2.3.2, "@tailwindcss/vite@4.2.1", tailwindcss@4.2.2, vitest@4.1.2]
  patterns: [two-mode-architecture, import-maps-esm-sh, signal-based-state, css-custom-properties-theming]

key-files:
  created:
    - package.json
    - .gitignore
    - vite.config.js
    - src/index.html
    - src/styles.css
    - src/lib/theme.js
    - src/lib/brokers-loader.js
    - src/lib/router.js
    - public/brokers.json
    - public/README.md
  modified: []

key-decisions:
  - "Used @preact/signals 2.9.0 in package.json (Vite build) while import map pins 1.3.4 (CDN dev mode) per research guidance"
  - "import.meta.dirname used in vite.config.js instead of __dirname workaround (Node 22+ supports this natively)"
  - "CSS custom properties in :root (dark defaults) with .light class override, matching UI-SPEC contract"

patterns-established:
  - "Two-mode architecture: CDN dev mode (src/index.html with import maps) and Vite production build (single HTML file)"
  - "Signal-based state: all app state via @preact/signals (isDark, currentPage, completedSteps)"
  - "Theme persistence: localStorage key 'ek-theme', dark/light class toggling on html element"
  - "Broker loading: fetch-first with window global and ES module fallbacks for file:// compatibility"

requirements-completed: [DIST-01, DIST-02, DIST-03]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 01 Plan 01: Project Scaffolding Summary

**Preact + HTM + Vite 7 two-mode architecture with CDN import maps, signal-based theme/routing, and dist/Erasure-Kit/ build output**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T19:05:38Z
- **Completed:** 2026-03-28T19:08:36Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Complete project scaffolding with Preact, Vite 7, vite-plugin-singlefile, Tailwind v4, and vitest
- Dev-mode index.html with esm.sh CDN import maps, full meta tags (OG, favicon, description), and CSS custom properties
- Signal-based theme system (dark/light toggle with localStorage persistence), page router, and dual-mode broker loader
- Distribution assets: seed brokers.json and end-user README.md

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffolding, Vite config, and dev-mode index.html** - `5967e21` (feat)
2. **Task 2: Theme system, broker loader, router signal, and distribution assets** - `ba4ef5d` (feat)

## Files Created/Modified
- `package.json` - Project metadata with Preact deps and Vite build scripts
- `.gitignore` - Excludes node_modules, dist, .vite
- `vite.config.js` - Vite 7 config with preact, tailwindcss, singlefile plugins and rename-html hook
- `src/index.html` - Dev-mode entry with import maps, CDN scripts, OG meta, emoji favicon, CSS custom properties
- `src/styles.css` - Production Tailwind entry with @custom-variant dark and @theme tokens
- `src/lib/theme.js` - Signal-based dark/light theme toggle with localStorage persistence
- `src/lib/brokers-loader.js` - Dual-mode brokers.json loader (fetch with file:// fallbacks)
- `src/lib/router.js` - Signal-based page routing with step completion tracking
- `public/brokers.json` - Seed broker entry for development validation
- `public/README.md` - Distribution README with quick start, file listing, and privacy info

## Decisions Made
- Used @preact/signals 2.9.0 in package.json (for Vite build) while import map pins 1.3.4 (for CDN dev mode) -- research recommends 1.3.x for no-build and the bundler resolves singletons for build mode
- Used `import.meta.dirname` in vite.config.js (Node 22+ native support) instead of `__dirname` workaround
- CSS custom properties use `:root` for dark mode defaults with `.light` class override, matching the UI-SPEC.md contract

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all files contain complete implementations as specified.

## Next Phase Readiness
- Project scaffolding complete with all infrastructure for Plan 01-02
- Plan 01-02 can build app shell UI components (Header, Stepper, WelcomeScreen, etc.) on top of this foundation
- Theme, router, and broker loader signals are ready for component consumption

## Self-Check: PASSED

All 10 files verified present. Both commit hashes (5967e21, ba4ef5d) confirmed in git log.

---
*Phase: 01-app-shell-and-distribution*
*Completed: 2026-03-28*

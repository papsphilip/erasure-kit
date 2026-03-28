---
phase: 01-app-shell-and-distribution
plan: 02
subsystem: ui
tags: [preact, htm, signals, stepper, routing, welcome-screen, single-file-build]

# Dependency graph
requires:
  - phase: 01-app-shell-and-distribution/01
    provides: index.html with import maps, theme.js, router.js, brokers-loader.js, vite.config.js, styles.css
provides:
  - Complete interactive app shell with signal-based page routing
  - Header with brand text, theme toggle, hamburger menu
  - 4-step wizard stepper with free jumping and visual progress
  - Welcome screen with hero content, CTA, privacy statement
  - Hamburger menu with slide-in panel (Legal Reference, Escalation, About)
  - Placeholder pages for Identity, Brokers, Send, Track
  - About page with GDPR Article 17 information
  - Footer with Legal Reference and About navigation
  - Verified production build producing dist/Erasure-Kit/ (41KB erasure-kit.html + brokers.json + README.md)
affects: [02, 03, 04, 05, 06, 07, 08]

# Tech tracking
tech-stack:
  added: [htm@3.1.1]
  patterns: [htm-tagged-templates, signal-based-routing, css-custom-property-theming, conditional-stepper-display]

key-files:
  created:
    - src/app.js
    - src/components/Header.js
    - src/components/Stepper.js
    - src/components/ThemeToggle.js
    - src/components/HamburgerMenu.js
    - src/components/WelcomeScreen.js
    - src/components/Footer.js
    - src/pages/Identity.js
    - src/pages/Brokers.js
    - src/pages/Send.js
    - src/pages/Track.js
    - src/pages/About.js
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "Added htm as npm dependency (was CDN-only in dev mode) to support Vite production build"
  - "Used inline PlaceholderPage component in app.js for legal/escalation routes rather than separate files"
  - "Shield emoji rendered via Unicode escape in WelcomeScreen for cross-platform reliability"

patterns-established:
  - "Component pattern: import html from htm/preact, export named function component"
  - "Signal-based conditional rendering: currentPage.value === 'page' && html`<Component />`"
  - "Stepper shows only for wizard steps (identity/brokers/send/track), hidden on welcome/about/legal/escalation"
  - "Hamburger menu uses module-level signal (isOpen) for panel state"

requirements-completed: [DIST-01, DIST-02, DIST-03]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 01 Plan 02: App Shell UI Summary

**Interactive app shell with signal-based routing, 4-step wizard stepper, welcome screen with CTA, hamburger menu, and verified 41KB single-file production build**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-28T19:12:09Z
- **Completed:** 2026-03-28T19:18:06Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Complete navigable app shell with Header, Stepper, ThemeToggle, HamburgerMenu, Footer components
- Welcome screen with "Take back your data" hero, 4-step bullet list, Get Started/Resume Campaign CTA, and privacy statement
- Signal-based page routing rendering 8 distinct pages (welcome, identity, brokers, send, track, about, legal, escalation)
- Verified production build: dist/Erasure-Kit/erasure-kit.html (41KB, all JS/CSS inlined) + brokers.json + README.md

## Task Commits

Each task was committed atomically:

1. **Task 1: App shell components (Header, Stepper, ThemeToggle, HamburgerMenu, Footer)** - `7416e19` (feat)
2. **Task 2: Welcome screen, placeholder pages, About page, root App component, build verification** - `2fb53ba` (feat)

## Files Created/Modified
- `src/app.js` - Root App component with signal-based routing, conditional stepper, render mount
- `src/components/Header.js` - Sticky header with ErasureKit brand, ThemeToggle, HamburgerMenu
- `src/components/Stepper.js` - 4-step wizard navigation with circles, connectors, checkmarks
- `src/components/ThemeToggle.js` - Dark/light toggle with sun/moon SVG icons
- `src/components/HamburgerMenu.js` - Slide-in panel with Legal Reference, Escalation, About
- `src/components/WelcomeScreen.js` - Landing page with hero, bullets, CTA, privacy statement
- `src/components/Footer.js` - Navigation links to Legal Reference and About
- `src/pages/Identity.js` - Placeholder (Coming in Phase 2)
- `src/pages/Brokers.js` - Placeholder (Coming in Phase 3)
- `src/pages/Send.js` - Placeholder (Coming in Phase 5)
- `src/pages/Track.js` - Placeholder (Coming in Phase 5)
- `src/pages/About.js` - GDPR Article 17 info, privacy-first design, open-source description
- `package.json` - Added htm dependency for build mode
- `.gitignore` - Added package-lock.json exclusion

## Decisions Made
- Added `htm` as an npm dependency -- it was only available via CDN import map for dev mode, but Vite build mode needs it as a resolvable package
- Used inline PlaceholderPage component in app.js for legal/escalation routes since they share the same minimal pattern as step placeholders
- Added package-lock.json to .gitignore since the monorepo uses pnpm (npm was used locally in the worktree for dependency resolution)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added htm as npm dependency for Vite build**
- **Found during:** Task 2 (production build verification)
- **Issue:** Vite build failed with "Cannot find package 'htm'" -- the package was only available via CDN import map in dev mode
- **Fix:** Ran `npm install htm` to add it as a dependency in package.json
- **Files modified:** package.json
- **Verification:** `pnpm build` succeeds, dist/Erasure-Kit/erasure-kit.html produced at 41KB
- **Committed in:** 2fb53ba (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for build to succeed. htm was always a runtime dependency; it just wasn't declared in package.json since dev mode uses CDN.

## Issues Encountered
- Worktree did not have node_modules (not in pnpm workspace paths). Used `npm install` locally to resolve dependencies for building.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all components contain complete implementations for Phase 1 scope. Placeholder pages are intentionally minimal per spec (they will be implemented in their respective future phases).

## Next Phase Readiness
- Complete app shell ready for Phase 2 (Identity form)
- All routing infrastructure in place -- new pages just need to replace placeholder content
- Theme system, stepper navigation, and hamburger menu fully functional
- Production build pipeline verified end-to-end

## Self-Check: PASSED

---
*Phase: 01-app-shell-and-distribution*
*Completed: 2026-03-28*

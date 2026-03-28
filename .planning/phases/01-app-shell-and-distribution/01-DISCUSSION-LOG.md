# Phase 1: App Shell and Distribution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 01-app-shell-and-distribution
**Areas discussed:** Navigation pattern, Visual identity, Landing experience, Distribution details

---

## Navigation Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal tabs | Top bar with labeled tabs, all screens accessible at once | |
| Wizard / stepper | Step-by-step flow with numbered steps, progress indicator | ✓ |
| Sidebar | Left sidebar with vertical nav links | |

**User's choice:** Wizard / stepper
**Notes:** None

### Follow-up: Navigation Freedom

| Option | Description | Selected |
|--------|-------------|----------|
| Free jumping | All steps clickable from the start, no locked progression | ✓ |
| Locked linear | Steps unlock sequentially | |
| Unlock on first completion | Linear first run, then all unlocked | |

**User's choice:** Free jumping (Recommended)

### Follow-up: Step Count

| Option | Description | Selected |
|--------|-------------|----------|
| 4 main steps | Identity, Brokers, Send, Monitor. Legal/Escalation as secondary | ✓ |
| 6 steps | All screens as top-level steps | |
| 3 steps | Grouped (Setup, Send, Track) | |

**User's choice:** 4 main steps (Recommended)

### Follow-up: Step State

| Option | Description | Selected |
|--------|-------------|----------|
| Visual progress | Completed=checkmark, current=highlighted, future=dimmed | ✓ |
| Minimal | Only active step highlighted | |

**User's choice:** Visual progress (Recommended)

### Follow-up: Secondary Screen Access

| Option | Description | Selected |
|--------|-------------|----------|
| Contextual links | Help/info icon within relevant steps | ✓ (part of) |
| Footer links | Persistent footer with Legal/Escalation links | ✓ (part of) |
| Dropdown/menu | Hamburger menu with secondary items | ✓ (primary) |

**User's choice:** All of the above — hamburger menu as the main access point for Legal and Escalation, supplemented by contextual links and footer links

### Follow-up: Responsiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Responsive from the start | Stepper adapts to mobile, content stacks | ✓ |
| Desktop-only for v1 | Optimize for desktop, mobile in v2 | |
| Mobile-first | Design for mobile first, scale up | |

**User's choice:** Responsive from the start (Recommended)

---

## Visual Identity

### Color Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Dark mode only | Single dark theme, privacy tool convention | |
| Light mode only | Cleaner, more approachable | |
| Both with toggle | User chooses dark or light | ✓ |
| System preference auto | Follows OS setting | |

**User's choice:** Both with toggle

### Color Palette

| Option | Description | Selected |
|--------|-------------|----------|
| Privacy blue-gray | Cool blue-gray with sky blue/cyan accents | ✓ |
| Warm neutral | Neutral grays with amber/orange accent | |
| Emerald/green | Green-focused, safety/protection feel | |

**User's choice:** Privacy blue-gray (Recommended)

### Typography

| Option | Description | Selected |
|--------|-------------|----------|
| System fonts | OS font stack, zero loading, smallest bundle | ✓ |
| Inter (embedded) | Clean modern sans-serif, +100-200KB | |
| Plus Jakarta Sans | Virgo ecosystem font (would cause confusion) | |

**User's choice:** System fonts (Recommended)

### Branding

| Option | Description | Selected |
|--------|-------------|----------|
| Text-only for v1 | Just "ErasureKit" in header | ✓ |
| Simple icon + text | Shield/eraser icon next to name | |
| Emoji-based icon | Shield emoji as icon | |

**User's choice:** Text-only for v1 (Recommended)

### Light Mode Palette

| Option | Description | Selected |
|--------|-------------|----------|
| Inverted version | Same accents on white/light-gray surfaces | ✓ |
| Softer/warmer light | Cream/off-white backgrounds | |
| You decide | Claude picks | |

**User's choice:** Inverted version (Recommended)

### Border Radius

| Option | Description | Selected |
|--------|-------------|----------|
| Medium rounded | rounded-lg buttons, rounded-xl cards | ✓ |
| Fully rounded | rounded-full buttons, rounded-2xl cards | |
| Sharp corners | rounded-sm or none | |

**User's choice:** Medium rounded (Recommended)

---

## Landing Experience

### First Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Welcome + quick start | Brief welcome, bullet points, Get Started button | ✓ |
| Jump straight to Identity | Step 1 is the landing page | |
| Dashboard overview | Campaign status or welcome depending on state | |

**User's choice:** Welcome + quick start (Recommended)

### Resume Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, alongside Get Started | Two buttons: Get Started + Load Campaign | |
| Just Get Started | Load Campaign in settings/menu | |
| Auto-detect from localStorage | Show Resume if cached campaign exists | ✓ |

**User's choice:** Auto-detect from localStorage

### Privacy Notice

| Option | Description | Selected |
|--------|-------------|----------|
| Brief inline statement | One-line privacy message at bottom | ✓ |
| Detailed privacy badge | Visible badge listing guarantees | |
| Skip for v1 | No explicit messaging | |

**User's choice:** Brief inline statement + About page in hamburger menu
**Notes:** User also wants an About page accessible from the hamburger menu

---

## Distribution Details

### Production Filename

| Option | Description | Selected |
|--------|-------------|----------|
| index.html | Standard web convention | |
| erasure-kit.html | Descriptive name | ✓ |
| ErasureKit.html | Branded PascalCase | |

**User's choice:** erasure-kit.html

### Meta Tags

| Option | Description | Selected |
|--------|-------------|----------|
| Full branding | Title + description + Open Graph | ✓ |
| Minimal title only | Just "ErasureKit" title | |
| You decide | Claude picks | |

**User's choice:** Full branding (Recommended)

### Favicon

| Option | Description | Selected |
|--------|-------------|----------|
| Inline SVG favicon | Simple shield/eraser SVG as data URI | |
| Emoji favicon | Shield emoji via SVG text trick | ✓ |
| No favicon | Skip entirely | |

**User's choice:** Emoji favicon

### Distribution Structure

**User's clarification:** Distribution is a folder named `Erasure-Kit/` containing the HTML file and extra files. Not a single file.

### README

| Option | Description | Selected |
|--------|-------------|----------|
| README.txt | Brief plain-text file | |
| README.md | Markdown readme | ✓ |
| No README | App explains itself | |

**User's choice:** README.md

### Build Output

| Option | Description | Selected |
|--------|-------------|----------|
| Build to Erasure-Kit/ | Vite outputs to dist/Erasure-Kit/ ready to zip | ✓ |
| Build to dist/, assemble separately | Normal dist/ + separate assembly script | |

**User's choice:** Build to Erasure-Kit/ (Recommended)

---

## Claude's Discretion

- HTML structure for no-build dev mode (import maps, ES module scripts, CDN URLs)
- Vite configuration details for single-file output + Erasure-Kit/ folder structure
- Stepper component implementation approach
- Dark/light mode toggle mechanism
- brokers.json loading strategy

## Deferred Ideas

None — discussion stayed within phase scope

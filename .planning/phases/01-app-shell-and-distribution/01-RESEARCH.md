# Phase 1: App Shell and Distribution - Research

**Researched:** 2026-03-28
**Domain:** Preact + HTM no-build architecture, Vite single-file production build, Tailwind v4 CDN/build dual-mode
**Confidence:** HIGH

## Summary

This phase establishes the foundational two-mode architecture for ErasureKit: a zero-build-step development mode where `index.html` is opened directly in a browser with CDN-loaded dependencies, and a Vite production build that outputs a single self-contained HTML file. The core stack -- Preact 10.29.0, HTM 3.1.1, and Preact Signals 1.3.x -- has well-documented no-build workflows via import maps and esm.sh CDN. Tailwind CSS v4 provides dual-mode styling through `@tailwindcss/browser` (dev CDN) and `@tailwindcss/vite` (production build). The critical architectural challenge is loading `brokers.json` at runtime in the `file://` protocol context, which requires a specific workaround because `fetch()` is blocked by CORS on `file://` origins in most browsers.

The production build uses `vite-plugin-singlefile` (2.3.2) to inline all JS/CSS into a single HTML file, with `brokers.json` kept external as a separate file in the output `dist/Erasure-Kit/` folder. A post-build rename step is needed because Vite lacks native support for renaming the output HTML file from `index.html` to `erasure-kit.html`.

**Primary recommendation:** Use import maps with esm.sh CDN (`?external=preact` on all dependencies) for dev mode, `@preact/preset-vite` + `vite-plugin-singlefile` for production build, and a dual-strategy brokers.json loader that tries `fetch()` first and falls back to a `<script>` tag injection for `file://` compatibility.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Wizard/stepper layout with 4 top-level steps: Identity, Brokers, Send, Track (Monitor)
- **D-02:** Free jumping -- all steps clickable from the start, no locked linear progression
- **D-03:** Visual progress indicators -- completed steps get checkmark/filled state, current step highlighted, future steps dimmed
- **D-04:** Secondary screens (Legal Reference, Escalation, About) live in a hamburger menu, with additional contextual links within relevant steps and footer links for discoverability
- **D-05:** Responsive from the start -- stepper adapts to mobile viewports
- **D-06:** Both dark and light mode with a toggle. Dark mode as default.
- **D-07:** Privacy blue-gray color palette: Primary #0EA5E9 (sky blue), Accent #06B6D4 (cyan), Surface #1E293B (slate-800 dark) / inverted for light mode, Success #22C55E, Warning #F59E0B, Danger #EF4444
- **D-08:** Light mode is a standard inversion -- same accent colors on white/light-gray surfaces
- **D-09:** System font stack (-apple-system, Segoe UI, etc.) -- zero font loading, smallest bundle
- **D-10:** Text-only branding for v1 -- just "ErasureKit" in the header, no logo
- **D-11:** Medium rounded corners -- rounded-lg (8px) for buttons, rounded-xl (12-16px) for cards
- **D-12:** Welcome screen with quick-start content: brief explanation of what the app does (3-4 bullet points), "Get Started" button navigating to Step 1 (Identity)
- **D-13:** Auto-detect localStorage for returning users -- if cached campaign exists, show "Resume Campaign" instead of "Get Started"
- **D-14:** Brief inline privacy statement at bottom: "No data leaves your browser. No accounts. No tracking."
- **D-15:** About page accessible from hamburger menu
- **D-16:** Production HTML file named `erasure-kit.html`
- **D-17:** Full branding meta tags: title "ErasureKit -- GDPR Data Erasure Tool", description meta, Open Graph tags for social previews
- **D-18:** Emoji favicon using shield emoji via inline SVG text trick
- **D-19:** Distribution as a folder named `Erasure-Kit/` containing erasure-kit.html + brokers.json + README.md
- **D-20:** Vite build outputs directly to `dist/Erasure-Kit/` ready for zip and share
- **D-21:** README.md (markdown) included in distribution folder

### Claude's Discretion
- HTML structure for no-build dev mode (import maps, ES module scripts, CDN URLs)
- Vite configuration details for single-file output + Erasure-Kit/ folder structure
- Stepper component implementation approach
- Dark/light mode toggle mechanism (CSS custom properties, Tailwind dark: variant, etc.)
- brokers.json loading strategy (fetch in both dev and prod modes)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIST-01 | App builds to a single portable HTML file via Vite + vite-plugin-singlefile | Verified: vite-plugin-singlefile 2.3.2 supports Vite 7.x, @preact/preset-vite 2.10.5 supports Vite 7.x, configuration pattern documented |
| DIST-02 | App works in development mode with zero build step (CDN-loaded modules, open index.html directly) | Verified: Preact official no-build workflows guide, import maps with esm.sh CDN, @tailwindcss/browser for dev-mode Tailwind |
| DIST-03 | brokers.json is a standalone file that can be updated independently of the app | Verified: Vite public folder files are NOT inlined by vite-plugin-singlefile, brokers.json stays separate in build output. Requires dual-loading strategy for file:// vs http:// |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Preact | 10.29.0 | UI framework (3KB gzipped) | Official stable, React-compatible API, first-class no-build support via HTM |
| HTM | 3.1.1 | Tagged template JSX alternative (<1KB) | Official Preact recommendation for no-build. Tagged templates, zero transpiler |
| @preact/signals | 1.3.4 | Reactive state management (1.6KB) | Use 1.3.x (NOT 2.x) for CDN/no-build mode -- official Preact docs recommend this version for import map workflows. 2.x works with build tools but has unverified CDN edge cases |
| @tailwindcss/browser | 4.2.2 | Dev-mode utility CSS (CDN, ~300KB) | Official Tailwind CDN for no-build development. JIT in browser. |
| @tailwindcss/vite | 4.2.2 | Production CSS compilation | Official Vite plugin, tree-shakes to ~15-25KB |
| Vite | 7.3.1 | Dev server + production bundler | Latest 7.x stable. Use 7.x (not 8.x) for vite-plugin-singlefile compatibility. @preact/preset-vite supports 7.x. |
| vite-plugin-singlefile | 2.3.2 | Inline all JS/CSS into single HTML | Produces one portable HTML file. Peer dep: `vite ^5\|^6\|^7\|^8` |
| @preact/preset-vite | 2.10.5 | Preact integration for Vite | Official Preact plugin, handles HTM, aliasing, devtools. Peer dep: `vite 2.x-8.x` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| preact-htm-signals-standalone | latest | Single-file bundle of Preact+HTM+Signals | NOT recommended for this project -- useful as fallback reference only. We use import maps for proper dependency control. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @preact/signals 1.3.x | @preact/signals 2.9.0 | 2.x has more features but official Preact no-build docs only test with 1.3.x. Risk of CDN singleton issues. Use 1.3.x for dev/CDN mode; Vite build can use either since build tools resolve singletons properly. |
| Vite 7.3.1 | Vite 8.0.3 | vite-plugin-singlefile now supports Vite 8, but @preact/preset-vite also supports it. Could upgrade later if needed, but 7.x is proven stable. |
| esm.sh CDN | unpkg.com | unpkg requires mapping @preact/signals-core separately. esm.sh handles transitive deps better with ?external param. |
| @tailwindcss/browser | Plain CSS | More verbose, no utility classes, slower development. CDN is fine for dev-only usage. |

**Installation (build mode only):**
```bash
pnpm init
pnpm add preact @preact/signals
pnpm add -D vite @preact/preset-vite vite-plugin-singlefile @tailwindcss/vite tailwindcss
```

## Architecture Patterns

### Recommended Project Structure
```
erasure-kit/
├── src/
│   ├── index.html          # Entry point (dev mode: open directly; build mode: Vite entry)
│   ├── app.js              # Root App component (stepper, routing, theme)
│   ├── components/
│   │   ├── Stepper.js      # 4-step wizard navigation
│   │   ├── WelcomeScreen.js # Landing/welcome page
│   │   ├── ThemeToggle.js  # Dark/light mode switch
│   │   └── HamburgerMenu.js # Secondary nav (Legal, Escalation, About)
│   ├── pages/
│   │   ├── Identity.js     # Step 1 placeholder
│   │   ├── Brokers.js      # Step 2 placeholder
│   │   ├── Send.js         # Step 3 placeholder
│   │   ├── Track.js        # Step 4 placeholder
│   │   └── About.js        # About page
│   ├── lib/
│   │   ├── brokers-loader.js  # Dual-mode brokers.json loading
│   │   └── theme.js        # Theme signal + persistence
│   └── styles.css          # Tailwind entry (build mode) + CSS custom properties
├── public/
│   ├── brokers.json        # Separate broker database (NOT inlined by singlefile plugin)
│   └── README.md           # Distribution README
├── vite.config.js          # Vite + singlefile + Preact config
├── package.json
└── .gitignore
```

### Pattern 1: Import Map for No-Build Mode

**What:** Browser-native import maps resolve bare module specifiers to CDN URLs, allowing ES module imports without a bundler.

**When to use:** Development mode -- opening `src/index.html` directly in a browser.

**Example:**
```html
<!-- Source: https://preactjs.com/guide/v10/no-build-workflows/ -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErasureKit — GDPR Data Erasure Tool</title>

  <!-- Tailwind CSS v4 Play CDN (dev mode only) -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

  <!-- Import Map: resolve bare specifiers to esm.sh CDN -->
  <script type="importmap">
  {
    "imports": {
      "preact": "https://esm.sh/preact@10.29.0",
      "preact/": "https://esm.sh/preact@10.29.0/",
      "preact/hooks": "https://esm.sh/preact@10.29.0/hooks",
      "@preact/signals": "https://esm.sh/@preact/signals@1.3.4?external=preact",
      "htm/preact": "https://esm.sh/htm@3.1.1/preact?external=preact"
    }
  }
  </script>

  <!-- Dark/light mode CSS custom properties -->
  <style type="text/tailwindcss">
    @custom-variant dark (&:where(.dark, .dark *));

    :root {
      --ek-primary: #0EA5E9;
      --ek-accent: #06B6D4;
      --ek-surface: #F8FAFC;
      --ek-surface-alt: #F1F5F9;
      --ek-text: #0F172A;
      --ek-text-muted: #64748B;
      --ek-success: #22C55E;
      --ek-warning: #F59E0B;
      --ek-danger: #EF4444;
    }
    .dark {
      --ek-surface: #1E293B;
      --ek-surface-alt: #334155;
      --ek-text: #F8FAFC;
      --ek-text-muted: #94A3B8;
    }
  </style>
</head>
<body class="dark">
  <div id="app"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

**CRITICAL:** The `?external=preact` parameter on esm.sh URLs prevents duplicate Preact instances. Without it, `@preact/signals` and `htm/preact` each bundle their own copy of Preact, which breaks signal-driven re-rendering silently.

### Pattern 2: Dual-Mode Brokers.json Loading

**What:** A loading strategy that works both when the HTML is opened via `file://` protocol (no-build dev) and when served via HTTP (Vite dev server or production).

**When to use:** Always -- this is the core data loading mechanism.

**Why needed:** `fetch()` is blocked by CORS on `file://` origins in Chrome and most browsers. A fallback is required.

**Example:**
```javascript
// src/lib/brokers-loader.js
// Source: Research synthesis from MDN CORS docs and file:// protocol behavior

/**
 * Load brokers.json with file:// protocol fallback.
 *
 * Strategy:
 * 1. Try fetch() -- works over http:// (Vite dev server, production)
 * 2. If fetch fails (file:// CORS block), inject a <script> tag
 *    that loads brokers.js (a thin wrapper around the JSON data)
 *
 * For dev mode file:// usage, a brokers.js shim is provided:
 *   window.__ERASUREKIT_BROKERS__ = [ ... broker data ... ];
 *
 * For production, fetch() always works since the file is served over http
 * or loaded from the same-origin single-file context.
 */
export async function loadBrokers() {
  try {
    // Attempt 1: fetch() -- works on http://, fails on file://
    const response = await fetch('./brokers.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    // Attempt 2: Check if already loaded via <script> tag
    if (window.__ERASUREKIT_BROKERS__) {
      return window.__ERASUREKIT_BROKERS__;
    }

    // Attempt 3: Try loading as ES module (may work on some browsers with file://)
    try {
      const module = await import('./brokers.js');
      return module.default;
    } catch (e2) {
      console.warn('ErasureKit: Could not load brokers.json. Using empty broker list.');
      console.warn('Tip: Use a local server (e.g., "npx serve src") for full functionality.');
      return [];
    }
  }
}
```

**Alternative simpler approach (recommended):** Since the no-build dev mode is primarily for contributors who likely have Node.js, the dev instructions can recommend `npx serve src` instead of double-clicking `index.html`. This sidesteps the `file://` CORS problem entirely. However, the fallback should still exist for maximum portability.

### Pattern 3: Signal-Based Routing (No Library)

**What:** Use a Preact signal to track the current "page" and conditionally render components. No router library needed for a wizard with 4-5 screens.

**When to use:** This app has exactly 4 wizard steps + 3 secondary pages. Hash-based routing is overkill.

**Example:**
```javascript
// Source: Preact Signals docs
import { signal } from '@preact/signals';
import { html } from 'htm/preact';

// Page state
const currentPage = signal('welcome'); // 'welcome' | 'identity' | 'brokers' | 'send' | 'track' | 'about' | 'legal' | 'escalation'

function App() {
  return html`
    <div class="min-h-screen bg-[var(--ek-surface)] text-[var(--ek-text)]">
      ${currentPage.value === 'welcome' && html`<${WelcomeScreen} />`}
      ${currentPage.value === 'identity' && html`<${IdentityPage} />`}
      ${currentPage.value === 'brokers' && html`<${BrokersPage} />`}
      ${currentPage.value === 'send' && html`<${SendPage} />`}
      ${currentPage.value === 'track' && html`<${TrackPage} />`}
      ${currentPage.value === 'about' && html`<${AboutPage} />`}
    </div>
  `;
}
```

### Pattern 4: Dark/Light Theme Toggle with CSS Custom Properties

**What:** Toggle a `dark` class on `<html>`, use CSS custom properties for theme colors, persist preference to localStorage.

**When to use:** Always -- this is a locked decision (D-06, D-07, D-08).

**Example:**
```javascript
// src/lib/theme.js
import { signal, effect } from '@preact/signals';

// Initialize from localStorage or default to dark
const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('ek-theme') : null;
export const isDark = signal(stored ? stored === 'dark' : true);

// Sync to DOM and localStorage
effect(() => {
  document.documentElement.classList.toggle('dark', isDark.value);
  localStorage.setItem('ek-theme', isDark.value ? 'dark' : 'light');
});

export function toggleTheme() {
  isDark.value = !isDark.value;
}
```

### Pattern 5: Vite Configuration for Erasure-Kit/ Output

**What:** Configure Vite to output to `dist/Erasure-Kit/` with the HTML renamed to `erasure-kit.html` and brokers.json kept separate.

**When to use:** Production build only.

**Example:**
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { rename } from 'fs/promises';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  plugins: [
    preact(),
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
    // Post-build: rename index.html to erasure-kit.html
    {
      name: 'rename-html',
      closeBundle: async () => {
        const outDir = resolve(__dirname, 'dist/Erasure-Kit');
        try {
          await rename(
            resolve(outDir, 'index.html'),
            resolve(outDir, 'erasure-kit.html')
          );
        } catch (e) {
          // File may already be renamed or not exist during dev
        }
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, 'dist/Erasure-Kit'),
    emptyOutDir: true,
  },
  publicDir: resolve(__dirname, 'public'),
});
```

**Key insight:** Vite has no native way to rename the output HTML file. A custom plugin with `closeBundle` hook handles the rename. The `public/` folder contents (brokers.json, README.md) are copied to `dist/Erasure-Kit/` by Vite automatically and are NOT inlined by vite-plugin-singlefile.

### Anti-Patterns to Avoid

- **Importing Preact without `?external=preact` on CDN URLs:** Creates duplicate Preact instances, breaks signals and hooks silently. Always use `?external=preact` on esm.sh imports.
- **Using `@preact/signals` v2.x in CDN/import map mode:** Official Preact docs only test v1.3.x for no-build workflows. v2.x may work but is unverified for this path.
- **Using `fetch()` without fallback for `file://` protocol:** Will fail silently with CORS error when user double-clicks `index.html`.
- **Mixing `@tailwindcss/browser` and `@tailwindcss/vite` in the same page load:** Keep them separate -- CDN for dev HTML, Vite plugin for production build.
- **Using `@apply` in CDN/browser Tailwind:** Not supported in the browser build of Tailwind v4. Use utility classes directly or CSS custom properties.
- **Inlining brokers.json into the HTML bundle:** Defeats DIST-03 requirement. Keep it in `public/` so it stays as a separate file in the build output.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSX without build step | Custom template parser | HTM (htm/preact) | Battle-tested, <1KB, maintained by Preact creator (Jason Miller) |
| CSS utility framework | Custom CSS utility classes | @tailwindcss/browser (dev) + @tailwindcss/vite (prod) | Dual-mode support is the exact use case; rolling custom utilities is wasted effort |
| Module resolution in browser | Custom script loader | Browser import maps | Native browser feature, works in Chrome 89+, Firefox 108+, Safari 16.4+ |
| Single-file HTML bundling | Custom build script with inline injection | vite-plugin-singlefile | Handles JS, CSS, images, fonts -- edge cases everywhere in manual inlining |
| Preact Vite integration | Custom esbuild/rollup config | @preact/preset-vite | Handles HTM transform, aliasing, devtools, HMR -- lots of hidden config |

**Key insight:** The two-mode architecture (no-build dev + Vite production) is the deceptively complex part. Each mode has its own dependency resolution path and styling pipeline. The libraries above abstract this correctly.

## Common Pitfalls

### Pitfall 1: Duplicate Preact Instances in CDN Mode
**What goes wrong:** Signals don't trigger re-renders. Hooks throw "hooks can only be called from a component" errors. Components render but never update.
**Why it happens:** esm.sh bundles a separate copy of Preact inside each dependency unless told not to. Two Preact instances can't share internal state.
**How to avoid:** Always use `?external=preact` on all esm.sh URLs that depend on Preact (`@preact/signals`, `htm/preact`). Verify import map has `"preact/"` entry (with trailing slash) for subpath imports.
**Warning signs:** Console shows no errors, but signal updates don't reflect in the DOM. Or: "Cannot update a component from inside the function body of a different component."

### Pitfall 2: file:// Protocol Blocks fetch() and ES Modules
**What goes wrong:** `fetch('./brokers.json')` throws a CORS error. ES module `import` may also fail from `file://` origins.
**Why it happens:** Browsers treat `file://` as a null origin. Same-origin policy blocks requests between files.
**How to avoid:** Provide a `brokers.js` fallback file (wrapping the JSON as a JS export) and a dual-loading strategy. Document that `npx serve src` is the recommended dev workflow.
**Warning signs:** Network tab shows `(blocked:mixed-content)` or `CORS error` for local file requests. Console shows `TypeError: Failed to fetch`.

### Pitfall 3: Tailwind v4 CDN `@custom-variant` Must Be in `<style type="text/tailwindcss">`
**What goes wrong:** `dark:` classes don't apply when toggling the `.dark` class on `<html>`.
**Why it happens:** In Tailwind v4, the `darkMode: 'class'` config key from v3 is gone. You must use `@custom-variant dark (&:where(.dark, .dark *));` in CSS. In CDN mode, this goes in a `<style type="text/tailwindcss">` block.
**How to avoid:** Add the `@custom-variant` directive in the style block. For production build, put it in `styles.css` with `@import 'tailwindcss';`.
**Warning signs:** `dark:bg-slate-800` has no effect. Inspecting the element shows no dark-mode CSS generated.

### Pitfall 4: Vite Cannot Natively Rename Output HTML
**What goes wrong:** Build outputs `dist/Erasure-Kit/index.html` instead of `dist/Erasure-Kit/erasure-kit.html`.
**Why it happens:** Vite's HTML output naming is hardcoded to match the input file name. No `build` config option exists to rename it.
**How to avoid:** Use a custom Vite plugin with `closeBundle` hook to rename the file after build completes. Or use a post-build npm script.
**Warning signs:** `dist/Erasure-Kit/` contains `index.html` instead of `erasure-kit.html`.

### Pitfall 5: Import Map Browser Support
**What goes wrong:** App fails to load in older browsers.
**Why it happens:** Import maps require Chrome 89+, Firefox 108+, Safari 16.4+. IE and very old mobile browsers don't support them.
**How to avoid:** This is acceptable for the target audience (privacy-conscious European adults using modern browsers). The production single-file build doesn't use import maps -- only the dev mode does.
**Warning signs:** Console shows `SyntaxError` on the import map script tag.

### Pitfall 6: Signals v1.3.x CDN Requires preact/ Subpath Mapping
**What goes wrong:** `@preact/signals` import fails with "Failed to resolve module specifier" error.
**Why it happens:** Signals internally imports from `preact/hooks`. Without a `"preact/"` trailing-slash entry in the import map, the browser can't resolve `preact/hooks`.
**How to avoid:** Always include both `"preact"` AND `"preact/"` in the import map:
```json
{
  "preact": "https://esm.sh/preact@10.29.0",
  "preact/": "https://esm.sh/preact@10.29.0/"
}
```
**Warning signs:** Error message mentions "preact/hooks" not found.

## Code Examples

### Complete Dev-Mode index.html Shell
```html
<!-- Source: Synthesized from Preact no-build docs + Tailwind v4 CDN docs -->
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErasureKit — GDPR Data Erasure Tool</title>
  <meta name="description" content="Free, open-source tool to send GDPR Article 17 data erasure requests to all known data brokers. No accounts, no tracking.">

  <!-- Open Graph -->
  <meta property="og:title" content="ErasureKit — GDPR Data Erasure Tool">
  <meta property="og:description" content="One-click automated data erasure across all known brokers. Free, open-source, no tracking.">
  <meta property="og:type" content="website">

  <!-- Emoji favicon (shield) -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">

  <!-- Tailwind v4 CDN (dev mode only, ~300KB, not for production) -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>

  <!-- Import Map -->
  <script type="importmap">
  {
    "imports": {
      "preact": "https://esm.sh/preact@10.29.0",
      "preact/": "https://esm.sh/preact@10.29.0/",
      "preact/hooks": "https://esm.sh/preact@10.29.0/hooks",
      "@preact/signals": "https://esm.sh/@preact/signals@1.3.4?external=preact",
      "htm/preact": "https://esm.sh/htm@3.1.1/preact?external=preact"
    }
  }
  </script>

  <!-- Theme: CSS custom properties + Tailwind dark mode -->
  <style type="text/tailwindcss">
    @custom-variant dark (&:where(.dark, .dark *));

    @theme {
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
      --color-ek-primary: #0EA5E9;
      --color-ek-accent: #06B6D4;
      --color-ek-success: #22C55E;
      --color-ek-warning: #F59E0B;
      --color-ek-danger: #EF4444;
    }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors">
  <div id="app"></div>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### Stepper Component Pattern
```javascript
// Source: Architecture pattern for wizard navigation
import { html } from 'htm/preact';

const STEPS = [
  { id: 'identity', label: 'Identity', number: 1 },
  { id: 'brokers',  label: 'Brokers',  number: 2 },
  { id: 'send',     label: 'Send',     number: 3 },
  { id: 'track',    label: 'Track',    number: 4 },
];

function Stepper({ currentStep, completedSteps, onStepClick }) {
  return html`
    <nav class="flex items-center justify-center gap-2 py-4" aria-label="Progress">
      ${STEPS.map((step, i) => {
        const isCurrent = currentStep === step.id;
        const isCompleted = completedSteps.includes(step.id);
        return html`
          ${i > 0 && html`
            <div class="w-8 h-0.5 ${isCompleted ? 'bg-ek-primary' : 'bg-slate-300 dark:bg-slate-600'}"></div>
          `}
          <button
            onClick=${() => onStepClick(step.id)}
            class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
              ${isCurrent ? 'bg-ek-primary text-white' : ''}
              ${isCompleted && !isCurrent ? 'text-ek-primary' : ''}
              ${!isCurrent && !isCompleted ? 'text-slate-400 dark:text-slate-500' : ''}
              hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-current=${isCurrent ? 'step' : undefined}
          >
            <span class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2
              ${isCurrent ? 'border-white bg-white/20' : ''}
              ${isCompleted ? 'border-ek-primary bg-ek-primary text-white' : ''}
              ${!isCurrent && !isCompleted ? 'border-current' : ''}">
              ${isCompleted ? html`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>` : step.number}
            </span>
            <span class="hidden sm:inline text-sm font-medium">${step.label}</span>
          </button>
        `;
      })}
    </nav>
  `;
}
```

### Production Build Tailwind CSS Entry
```css
/* src/styles.css (used by Vite build, NOT the CDN dev mode) */
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  --color-ek-primary: #0EA5E9;
  --color-ek-accent: #06B6D4;
  --color-ek-success: #22C55E;
  --color-ek-warning: #F59E0B;
  --color-ek-danger: #EF4444;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 CDN (`cdn.tailwindcss.com` + JS config object) | Tailwind v4 CDN (`@tailwindcss/browser` + CSS-first `@theme`/`@custom-variant`) | Tailwind v4.0 (Jan 2025) | Config is now CSS, not JS. `darkMode: 'class'` replaced by `@custom-variant`. No `@apply` in CDN mode. |
| `tailwind.config.js` `darkMode: 'class'` | `@custom-variant dark (&:where(.dark, .dark *));` in CSS | Tailwind v4.0 | Must use `<style type="text/tailwindcss">` for CDN mode |
| @preact/signals 1.x | @preact/signals 2.x available | Mid-2024 | v2.x adds `Show` component, `createModel`, but official no-build docs still show 1.3.x |
| vite-plugin-singlefile supported Vite 5-7 | Now supports Vite 5-8 | Recent | Peer dep expanded. 7.x remains safest for this project. |
| browser-fs-access 0.35.0 | browser-fs-access 0.38.0 | Recent | Minor updates. API unchanged. |

**Deprecated/outdated:**
- Tailwind v3 CDN script (`cdn.tailwindcss.com`): Still works but Tailwind v4 is current. v3 CDN uses different configuration API.
- Preact 11 beta: Exists but not production-ready. Stay on 10.29.0 for stability.

## Open Questions

1. **@preact/signals version for CDN mode**
   - What we know: Official Preact docs recommend 1.3.0 for import map workflows. 1.3.4 is latest in 1.3.x range. 2.x has more features but is untested for CDN/no-build.
   - What's unclear: Whether 1.3.4 specifically works with Preact 10.29.0 via esm.sh (the docs show 10.23.1). Version mismatch is unlikely to cause issues but not explicitly tested.
   - Recommendation: Use 1.3.4 for CDN/dev mode. During implementation, if any signal re-render issues appear, fall back to 1.3.0. For the Vite build, the bundler resolves singletons properly so version is less critical.

2. **file:// Protocol ES Module Loading**
   - What we know: Chrome and Firefox block `fetch()` from `file://`. Import maps themselves work from `file://` with CDN URLs (since those are `https://`). Local `import('./some-file.js')` may or may not work depending on browser and settings.
   - What's unclear: Whether `<script type="module" src="./app.js">` works from `file://` in all target browsers when the app.js imports other local files.
   - Recommendation: Primary dev workflow should be `npx serve src` (or Vite dev server). Document file:// as "may work in some browsers" rather than a guaranteed path. The production single-file build works everywhere since everything is inlined.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite build, pnpm | Yes | v24.12.0 | -- |
| pnpm | Package installation | Yes | 9.15.0 | npm 9.2.0 also available |
| npx | Quick dev server (`npx serve`) | Yes | 9.2.0 | -- |
| Git | Version control | Yes | 2.47.1 | -- |
| Modern browser | Running the app | Yes (implied) | -- | -- |

**Missing dependencies with no fallback:** None

**Missing dependencies with fallback:** None

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | none -- see Wave 0 |
| Quick run command | `pnpm exec vitest run --reporter=verbose` |
| Full suite command | `pnpm exec vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIST-01 | Vite build produces single HTML file with all JS/CSS inlined | integration | `pnpm exec vitest run src/__tests__/build-output.test.js -x` | Wave 0 |
| DIST-02 | index.html contains valid import map with all required CDN URLs, Tailwind CDN script tag, and module entry point | unit | `pnpm exec vitest run src/__tests__/dev-mode.test.js -x` | Wave 0 |
| DIST-03 | brokers.json exists as separate file in build output, not inlined into HTML | integration | `pnpm exec vitest run src/__tests__/build-output.test.js -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm exec vitest run --reporter=verbose`
- **Per wave merge:** `pnpm exec vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.js` -- Vitest config for the project (needs `@preact/preset-vite` integration)
- [ ] `src/__tests__/build-output.test.js` -- Verifies DIST-01 (single file output) and DIST-03 (brokers.json separate)
- [ ] `src/__tests__/dev-mode.test.js` -- Verifies DIST-02 (index.html has import map, CDN scripts, module entry)
- [ ] Framework install: `pnpm add -D vitest` -- no test framework currently installed

## Project Constraints (from CLAUDE.md)

The project-level CLAUDE.md defines the full technology stack. Key directives relevant to this phase:

- **Core stack:** Preact 10.29.0, HTM 3.1.1, Vite 7.x, vite-plugin-singlefile, Tailwind v4, @preact/signals
- **Two-mode architecture:** No-build dev (CDN) + Vite production build (single HTML file)
- **Icons:** Inline SVG (NOT Lucide React -- Lucide is React-specific, inappropriate for Preact)
- **Types:** JSDoc annotations, NOT TypeScript (TypeScript requires compilation, incompatible with no-build mode)
- **State management:** Preact Signals (NOT Zustand -- Zustand requires bundler)
- **GSD workflow enforcement:** All work through GSD commands
- **Python env isolation:** Not relevant to this phase (JavaScript only)
- **Session management:** `continue_here.md` with YAML frontmatter already exists

## Sources

### Primary (HIGH confidence)
- [Preact no-build workflows guide](https://preactjs.com/guide/v10/no-build-workflows/) -- Import maps, esm.sh CDN, HTM integration, ?external=preact pattern
- [Tailwind CSS Play CDN docs](https://tailwindcss.com/docs/installation/play-cdn) -- @tailwindcss/browser usage, limitations (dev only, no @apply)
- [Tailwind CSS dark mode docs](https://tailwindcss.com/docs/dark-mode) -- @custom-variant for class-based toggle in v4
- [vite-plugin-singlefile GitHub](https://github.com/richardtallent/vite-plugin-singlefile) -- Configuration options, public folder behavior, limitations
- npm registry -- Verified versions: Preact 10.29.0, HTM 3.1.1, @preact/signals 1.3.4 (1.3.x latest), Vite 7.3.1 (7.x latest), vite-plugin-singlefile 2.3.2, @preact/preset-vite 2.10.5, @tailwindcss/vite 4.2.2, @tailwindcss/browser 4.2.2, browser-fs-access 0.38.0

### Secondary (MEDIUM confidence)
- [MDN CORS documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) -- file:// protocol CORS restrictions confirmed
- [End Point Dev: Preact Web App Without npm Build](https://www.endpointdev.com/blog/2025/10/preact-web-app-without-npm-build/) -- Real-world no-build Preact app with signals
- [Tailwind v4 dark mode discussion](https://github.com/tailwindlabs/tailwindcss/discussions/18207) -- @custom-variant syntax confirmed
- [Vite build options docs](https://vite.dev/config/build-options) -- outDir, assetsDir, rollupOptions
- [Vite HTML rename discussion](https://github.com/vitejs/vite/issues/17831) -- Confirmed no native HTML rename support, custom plugin needed

### Tertiary (LOW confidence)
- [preact-htm-signals-standalone](https://github.com/mujahidfa/preact-htm-signals-standalone) -- Single bundle alternative, not recommended for this project but useful reference
- File:// protocol workarounds -- Synthesized from multiple blog posts, not empirically tested on all target browsers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry, official docs reviewed
- Architecture: HIGH -- patterns sourced from official Preact/Tailwind documentation
- Pitfalls: HIGH -- based on documented issues (duplicate instances, CORS, Tailwind v4 changes)
- Brokers.json loading from file://: MEDIUM -- workaround strategy is standard but not tested in this specific app context
- Vite HTML rename: MEDIUM -- custom plugin approach is well-known but Vite's closeBundle hook behavior with singlefile plugin needs validation

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack, 30-day validity)

# Technology Stack

**Project:** ErasureKit
**Researched:** 2026-03-28

## Critical Finding: mail.tm Cannot Send Emails

The PROJECT.md assumes mail.tm for sending GDPR erasure requests. **mail.tm is receive-only.** It has no `POST /messages` endpoint, no compose functionality, and its own FAQ states: "Unfortunately, we do not provide this feature." This is confirmed by the official API docs at `https://docs.mail.tm/` and all third-party wrapper libraries (e.g., `@cemalgnlts/mailjs`, `XielQs/mail.tm-api`).

Guerrilla Mail's website has a compose page, but its public API (`api.guerrillamail.com`) also documents only receive functions. No `send_email` endpoint exists in the documented API.

**Every free temp email API is receive-only.** No free, no-API-key temp email service exposes a send endpoint via REST API that works from a browser. This is the fundamental constraint that shapes the entire stack.

### Revised Email Architecture

The only viable approaches for a **zero-server, portable web app** that sends GDPR emails:

| Approach | How It Works | Tradeoff |
|----------|-------------|----------|
| **`mailto:` links** (recommended) | Generate pre-filled `mailto:` URIs, open user's email client | User clicks per broker (or batch), uses their own email |
| **EmailJS** | Third-party relay service, 200 emails/month free | Requires account setup, API key in client code, 200/month limit |
| **SMTP.js** | Proxies through smtpjs.com to an SMTP server | Credentials exposed in client, poor deliverability, not truly serverless |

**Recommendation: `mailto:` links as primary, with EmailJS as optional power-user upgrade.**

The `mailto:` approach is the only one that is truly serverless, requires zero accounts, exposes zero credentials, and works offline. It also means the emails come from the user's real email identity, which is actually **better for GDPR compliance** -- companies are more likely to honor requests from identifiable individuals than from anonymous temp addresses. This is corroborated by the temp email blacklisting pitfall: 188,000+ domains are actively blocked by services (per block-disposable-email.com), meaning many brokers would silently drop requests from mail.tm addresses anyway.

For users who want full automation (send hundreds of emails without clicking), EmailJS can be offered as an opt-in feature with their own EmailJS account.

### What Happens to mail.tm?

**Repurpose mail.tm as the response monitoring layer.** mail.tm excels at what it does: creating disposable inboxes and polling for incoming messages. The revised flow:

1. App generates a mail.tm temp address as the "reply-to" or CC address
2. User sends GDPR requests via `mailto:` from their email client, including the temp address
3. App polls mail.tm inbox for broker responses (copies/auto-replies)
4. App tracks deadlines, categorizes responses
5. After all brokers respond, temp account is deleted

This is actually a **stronger architecture**: the user's real email sends the request (more authoritative, harder to blacklist), and broker replies can be monitored via a disposable inbox.

**Confidence: HIGH** -- mail.tm API docs verified directly, multiple sources confirm receive-only.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Preact | 10.29.0 | UI framework | 3KB gzipped, React-compatible API, component model with hooks. The standard choice for portable single-file web apps. |
| HTM | 3.1.1 | JSX alternative (tagged templates) | No build step, no transpiler, works directly in browser. Under 1KB. |
| Preact Signals | 1.3.x | Reactive state management | Fine-grained reactivity without hooks boilerplate. 1.6KB. Better than Zustand for no-build apps. |

**Why Preact over React:** React is 40KB+ gzipped. For a portable single-file app where every byte matters and the app is distributed as a single downloadable file, Preact gives the same component model at 1/13th the size. The existing reference prototype uses React, but it was a prototype -- the production app should optimize for the distribution model.

**Why Preact over vanilla JS:** This app has significant UI complexity -- dashboard with stats, filterable broker list, per-broker status tracking, email template preview, settings panel, legal reference pages. Vanilla JS DOM manipulation becomes unmaintainable at this scale. Preact gives component architecture at 3KB.

**Why HTM over JSX:** JSX requires a build step (Babel/SWC transpilation). HTM uses native tagged template literals that run directly in any modern browser. This is critical for the "double-click and open" portability requirement. The app can be developed and tested with zero tooling -- just open `index.html` in a browser.

**Why Preact Signals over Zustand:** Zustand requires a bundler to import properly and adds ~3KB. Signals work natively with Preact, provide fine-grained reactivity (only re-render what changed), and load from CDN without issues. For a no-build-step app, Signals is the natural choice.

**Why not TypeScript:** TypeScript requires a compilation step. For a project that values "no build step" during development, TypeScript would force all contributors to run a compiler. JSDoc type annotations provide type checking in editors (VS Code) without a build step.

**Confidence: HIGH** -- Preact 10.29.0 verified on npm (published 12 days ago), HTM 3.1.1 verified on GitHub, Preact official guide documents no-build workflows with HTM and import maps.

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tailwindcss/browser | 4.x | Utility CSS in browser (dev mode) | JIT compilation in browser, no build step, one `<script>` tag |
| @tailwindcss/vite | 4.x | Optimized CSS (build mode) | Pre-compiled, tree-shaken CSS for production single-file output |

**Two-mode approach:**
- **Development:** `@tailwindcss/browser` CDN script (~300KB) provides all Tailwind classes without a build step. Edit and refresh.
- **Production build:** `@tailwindcss/vite` compiles only used classes into a static CSS file (~15-25KB), which gets inlined by vite-plugin-singlefile.

**Why Tailwind over plain CSS:** Utility classes speed up development, maintain consistency, and Tailwind inlines perfectly into the single-file output. Contributors can work without learning a custom CSS architecture.

**Confidence: MEDIUM** -- Tailwind v4 CDN works, but the two-mode approach (CDN for dev, Vite plugin for build) adds some complexity. Needs validation that both produce consistent results.

### Email Sending

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `mailto:` URIs | (browser native) | Primary email sending | Zero dependencies, works offline, no credentials, no CORS, no accounts |
| EmailJS | 4.x | Optional automated sending | 200 emails/month free, browser-native, handles CORS internally |

**`mailto:` implementation pattern:**

```javascript
function buildMailtoLink(brokerEmail, userName, userEmails, replyToTemp) {
  const subject = encodeURIComponent(
    'Data Erasure Request - GDPR Article 17'
  );
  const body = encodeURIComponent(
    generateGDPRTemplate(userName, userEmails, replyToTemp)
  );
  return `mailto:${brokerEmail}?subject=${subject}&body=${body}`;
}
// Trigger: window.location.href = buildMailtoLink(...)
```

**Batch sending UX:** Browsers block programmatic opening of multiple `mailto:` links. The UX must handle this:
1. Present brokers as a checklist with individual "Send" buttons
2. Each click opens the user's email client with pre-filled subject, body, and reply-to
3. After sending, user marks the broker as "sent" in the app
4. "Copy All" button generates a combined BCC list + template for power users

**EmailJS as opt-in upgrade:** Users who want true one-click bulk sending can configure their own EmailJS account (free tier: 200 emails/month, 2 templates, 50KB max). The app stores their public key in the local save file. This is the only way to achieve automated bulk sending without a server.

**Confidence: HIGH** for mailto (native browser feature, universal support). MEDIUM for EmailJS (200/month may be tight for power users with 500+ brokers).

### Email Monitoring

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| mail.tm REST API | v1 | Temp inbox for broker responses | Free, no API key, supports SSE for real-time, browser JS libraries exist |

**API endpoints used:**
- `GET /domains` -- list available temp email domains
- `POST /accounts` -- create temp inbox (address + password)
- `POST /token` -- get auth bearer token
- `GET /messages` -- poll for broker responses
- `GET /messages/{id}` -- fetch full message content
- `DELETE /accounts/{id}` -- delete temp account when done

**CORS status:** mail.tm appears CORS-friendly based on ecosystem evidence: browser-targeted JS libraries exist (`@cemalgnlts/mailjs` provides CDN script tags for browser use), and `publicapis.io` lists client-side `fetch()` examples. **CORS support has not been directly verified from a `file://` origin.** This must be validated in Phase 1.

**Fallback if CORS blocked:** A minimal Cloudflare Workers CORS proxy (free tier: 100,000 requests/day) wraps mail.tm API calls in ~15 lines of code. Deploys in minutes.

**Nuclear fallback:** If no proxy is available, the app degrades gracefully -- users check the mail.tm web interface manually for responses. The app still tracks deadlines and status locally.

**Rate limit:** 8 queries per second per IP. Adequate for periodic inbox polling (once every 30-60 seconds).

**Reliability concern:** mail.tm has documented outages (SaaSHub tracker shows daily reports). Mitigation: cache all fetched messages locally in the save file. The app must work in "offline mode" with cached data.

**Confidence: MEDIUM** -- API endpoints verified, CORS inferred from ecosystem but not tested from `file://` origin.

### File Persistence

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| browser-fs-access | 0.35.0 | Save/load progress to local JSON | Google ChromeLabs ponyfill, File System Access API with automatic fallback |

**How it works:**
- Chromium (Chrome, Edge, Brave): Uses native `showSaveFilePicker()`/`showOpenFilePicker()` -- direct file read/write without re-selecting
- Firefox/Safari: Falls back to `<input type="file">` for open and `<a download>` blob for save
- Zero-config: Call `fileOpen()` and `fileSave()`, library handles detection

**Why browser-fs-access over raw File System Access API:** Only 30/100 browser compatibility score (Chromium-only for picker methods). `browser-fs-access` provides a unified API with graceful degradation for all browsers.

**Why not localStorage:** PROJECT.md requires file-based save/load so users can backup, transfer, and inspect their data. localStorage is limited to ~5MB, gets cleared when users clear browsing data, and is lost in incognito mode. A GDPR campaign runs for weeks -- localStorage is too fragile.

**Save file format:** Single JSON file containing:
- User identity info (name, emails to erase)
- Broker list with per-broker send status and timestamps
- mail.tm temp inbox credentials (for session continuity)
- Cached message content from broker responses
- App version for future migration compatibility

**Confidence: HIGH** -- Google ChromeLabs library, Apache 2.0, well-maintained, 0.35.0 verified on npm.

### Bundling (Distribution Build)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | 7.x | Dev server + production bundler | Fast HMR, Preact ecosystem standard. v7 chosen for plugin compatibility. |
| vite-plugin-singlefile | 2.3.2 | Inline all JS/CSS into single HTML | Produces one portable `index.html` -- the entire app in one file |
| @preact/preset-vite | latest | Preact integration for Vite | Official Preact plugin, handles HTM/JSX, aliasing, devtools |

**Why Vite 7, not Vite 8:** `vite-plugin-singlefile` 2.3.2 has peer dependency `"vite": "^5.4.11 || ^6.0.0 || ^7.0.0"`. Vite 8 (released March 12, 2026) replaces Rollup with Rolldown, and the plugin has not been updated for it yet. Using Vite 7 avoids compatibility risk. Upgrade to Vite 8 once the plugin adds support.

**Build output:**
- `dist/index.html` -- complete app with all JS + CSS inlined (~50-100KB)
- `brokers.json` -- kept separate, loaded at runtime so the community can update it independently

**Confidence: HIGH** -- vite-plugin-singlefile 2.3.2 verified on npm (published 12 days ago), Vite 7 peer dep confirmed in package.json on GitHub.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x | Date arithmetic | Calendar-month deadline calculation (not naive 30-day addition). Lightweight, tree-shakeable. |
| `crypto.randomUUID()` | (browser native) | Unique IDs | Campaign IDs, broker tracking IDs. Native -- no library needed. Supported in all modern browsers. |

**Why no uuid library:** `crypto.randomUUID()` is natively available in all browsers since 2021 (Chrome 92, Firefox 95, Safari 15.4). No need for a dependency.

**Why no lucide-react:** Lucide-react is React-specific and adds 15KB+ for icon components. For a Preact + HTM app, inline SVG icons or a lightweight icon approach (copy SVG paths directly) keeps the bundle smaller. If icons are needed at scale, Lucide's SVG sprite or individual SVG files can be used without the React wrapper.

**Confidence: HIGH** -- date-fns verified, crypto.randomUUID() is a web standard.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Preact + HTM | React | 40KB+ gzipped, requires build step for JSX, overkill for portable single-file app |
| Framework | Preact + HTM | Vanilla JS | No component model, state management becomes unmanageable at this app's complexity |
| Framework | Preact + HTM | Svelte | Requires compiler (build step), no CDN/no-build option for development |
| Framework | Preact + HTM | Alpine.js | Good for adding interactivity to existing HTML, not for full SPA with complex state |
| State | Preact Signals | Zustand | Requires bundler, adds ~3KB, Signals are native to Preact and work without build step |
| Email sending | mailto: + EmailJS | mail.tm (sending) | **Cannot send emails** -- receive-only API, confirmed by official docs |
| Email sending | mailto: + EmailJS | SMTP.js | SMTP credentials exposed in client JS, depends on external smtpjs.com proxy, fails SPF checks |
| Email sending | mailto: + EmailJS | Resend / SendGrid | CORS blocked by design, requires server-side proxy, API key exposed in client |
| Email sending | mailto: + EmailJS | MailSlurp | Requires API key, official docs recommend server-side only, free tier limits unclear |
| Email monitoring | mail.tm | Guerrilla Mail | Public API also receive-only, no documented CORS support, session/cookie-based, undocumented rate limits |
| Styling | Tailwind v4 CDN | Plain CSS | More verbose, no utility classes, slower development, harder for open-source contributors |
| Styling | Tailwind v4 CDN | DaisyUI CDN | Adds opinionated component styles that may conflict with custom UI, extra dependency |
| File storage | browser-fs-access | Raw File System Access API | Only 30% browser support, no fallback -- Firefox/Safari users cannot save |
| File storage | browser-fs-access | localStorage | 5MB limit, cleared on browsing data wipe, lost in incognito, not portable between devices |
| Types | JSDoc annotations | TypeScript | TypeScript requires compilation step, incompatible with no-build development mode |
| Bundler | Vite 7 | Vite 8 | vite-plugin-singlefile does not support Vite 8 yet (Rolldown peer dep mismatch) |
| Bundler | Vite 7 | Webpack | Slower builds, more configuration, overkill for a small portable app |
| Icons | Inline SVG | Lucide React | Lucide React wrapper is React-specific, adds unnecessary bundle weight for Preact app |

---

## Two-Mode Architecture

The stack supports two distinct modes, optimizing for both contributors and end users:

### 1. No-Build Mode (Development / Quick Edit)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ErasureKit</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script type="importmap">
  {
    "imports": {
      "preact": "https://esm.sh/preact@10.29.0",
      "preact/hooks": "https://esm.sh/preact@10.29.0/hooks",
      "htm/preact": "https://esm.sh/htm@3.1.1/preact?external=preact",
      "@preact/signals": "https://esm.sh/@preact/signals@1.3.0?external=preact"
    }
  }
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/app.js"></script>
</body>
</html>
```

- Open `index.html` directly in browser -- works immediately
- No npm, no node, no build step required
- Edit source files, refresh browser to see changes
- Ideal for contributors, quick testing, and learning the codebase

### 2. Build Mode (Distribution)

```bash
npm install          # Install dev dependencies only
npm run build        # Vite bundles everything into dist/index.html
```

- Output: single `dist/index.html` (~50-100KB) with all JS + CSS inlined
- Minified, optimized, portable
- This is what gets released on GitHub and shared with users

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    viteSingleFile(),
  ],
  build: {
    // brokers.json is NOT inlined -- kept as separate editable file
    assetsInlineLimit: Infinity,
  },
});
```

---

## CORS Strategy

### mail.tm API (Response Monitoring)

**Primary:** Direct `fetch()` from browser. Evidence suggests mail.tm is CORS-friendly (browser JS libraries and CDN script tags exist).

**Fallback 1 -- Cloudflare Workers proxy:**
```javascript
// worker.js (~15 lines, free tier: 100K requests/day)
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    const resp = await fetch(target, {
      headers: { 'Authorization': request.headers.get('Authorization') || '' }
    });
    const newResp = new Response(resp.body, resp);
    newResp.headers.set('Access-Control-Allow-Origin', '*');
    newResp.headers.set('Access-Control-Allow-Headers', 'Authorization');
    return newResp;
  }
};
```

**Fallback 2 -- Manual check:** If no proxy is available, the app displays a link to the mail.tm web interface. Users check responses manually; the app still tracks deadlines locally.

### Email Sending (mailto:)

No CORS concern. `mailto:` links are browser-native -- they open the email client locally. No HTTP requests involved.

### Email Sending (EmailJS, optional)

EmailJS handles CORS internally. Their SDK makes requests to `api.emailjs.com` which returns proper CORS headers. The public key is designed to be in client-side code (restricted to specific domains and predefined templates).

---

## Runtime Dependencies Summary

| Package | Size (gzip) | CDN URL |
|---------|-------------|---------|
| Preact | 3 KB | `esm.sh/preact@10.29.0` |
| HTM/Preact | ~1 KB | `esm.sh/htm@3.1.1/preact` |
| Preact Signals | 1.6 KB | `esm.sh/@preact/signals@1.3.0` |
| browser-fs-access | 1.5 KB | `esm.sh/browser-fs-access@0.35.0` |
| Tailwind Browser (dev only) | ~300 KB | `cdn.jsdelivr.net/npm/@tailwindcss/browser@4` |
| **App total (dev mode)** | **~307 KB** | |
| **App total (production build)** | **~30-50 KB** | (Tailwind pre-compiled, all inlined) |

### Dev Dependencies (Build Mode Only)

```bash
npm install -D vite@7 @preact/preset-vite vite-plugin-singlefile @tailwindcss/vite date-fns
```

No runtime `node_modules` needed. All runtime deps load from CDN in dev mode or get bundled into the single HTML file in build mode.

---

## Installation

### For End Users (Zero Install)

1. Download `erasure-kit.html` (single file, ~50-100 KB)
2. Download `brokers.json` (broker database, keep in same folder)
3. Open `erasure-kit.html` in Chrome, Edge, Brave, Firefox, or Safari
4. Done -- no server, no account, no tracking

### For Developers / Contributors

```bash
git clone <repo>
cd erasure-kit

# Option A: No-build development (immediate start)
# Just open src/index.html in a browser -- works instantly

# Option B: Vite dev server (HMR, better DX)
npm install
npm run dev

# Build single-file distribution
npm run build
# Output: dist/index.html + brokers.json
```

---

## Prior Art: How Other Tools Handle Email

Understanding how existing GDPR tools send emails validates the `mailto:` approach:

| Tool | Architecture | Email Method | Portable? |
|------|-------------|-------------|-----------|
| **PrivacyBot** (UC Berkeley) | React + Flask (Python) | OAuth into user's Gmail, sends via Google API | No (server required) |
| **JustVanish** (AnalogJ) | Go CLI | SMTP with user-configured credentials (currently disabled) | No (Go runtime) |
| **Eraser** (digisamroc) | Go + SQLite + Web UI | SMTP / SendGrid / Resend (user-configured) | Self-hosted only |
| **datarequests.org** | Static website | Generates letter text, user copies into their email | Yes |
| **ErasureKit** (this project) | Single HTML file | `mailto:` links + optional EmailJS | **Yes** |

Every existing tool either requires a server/runtime or delegates sending to the user. ErasureKit takes the `datarequests.org` approach (user sends) and adds automation (pre-filled templates, batch generation, tracking, response monitoring via mail.tm).

---

## Sources

### Verified (HIGH confidence)
- [mail.tm API docs](https://docs.mail.tm/) -- confirmed receive-only, no send endpoint
- [mail.tm API root](https://api.mail.tm/) -- only GET /domains, GET /messages, POST /accounts, POST /token
- [mail.tm FAQ](https://mail.tm/en/faq/) -- "Unfortunately, we do not provide [sending]"
- [Preact npm](https://www.npmjs.com/package/preact) -- v10.29.0 current stable (published 12 days ago)
- [HTM GitHub](https://github.com/developit/htm) -- v3.1.1, tagged templates, standalone bundle
- [Preact no-build workflows](https://preactjs.com/guide/v10/no-build-workflows/) -- official guide for HTM + import maps
- [vite-plugin-singlefile npm](https://www.npmjs.com/package/vite-plugin-singlefile) -- v2.3.2, peer dep `vite ^5|^6|^7`
- [vite-plugin-singlefile GitHub](https://github.com/richardtallent/vite-plugin-singlefile) -- package.json confirms peer deps
- [browser-fs-access GitHub](https://github.com/GoogleChromeLabs/browser-fs-access) -- Google ChromeLabs, Apache 2.0
- [Tailwind CSS Play CDN](https://tailwindcss.com/docs/installation/play-cdn) -- `@tailwindcss/browser@4`
- [Vite releases](https://vite.dev/releases) -- v8.0.3 latest, v7.x still patched
- [File System Access API (Can I Use)](https://caniuse.com/native-filesystem-api) -- 30/100 compatibility, Chromium-only for pickers
- [PrivacyBot GitHub](https://github.com/privacybot-berkeley/privacybot) -- React + Flask, Gmail OAuth
- [JustVanish GitHub](https://github.com/AnalogJ/justvanish) -- Go, SMTP, send disabled
- [Eraser GitHub](https://github.com/digisamroc/eraser) -- Go + SQLite, multi-provider SMTP
- [EmailJS pricing](https://www.emailjs.com/pricing/) -- 200 emails/month free, 2 templates, 50KB limit
- [EmailJS FAQ](https://www.emailjs.com/docs/faq/can-i-use-emailjs-for-free/) -- no overage charges, requests simply stop
- [Cloudflare Workers CORS proxy example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)
- [Resend CORS docs](https://resend.com/docs/knowledge-base/how-do-i-fix-cors-issues) -- explicitly does NOT support browser calls
- [block-disposable-email.com](https://www.block-disposable-email.com/cms/) -- 188,384 blocked temp email domains

### Verified (MEDIUM confidence)
- [mail.tm CORS support](https://publicapis.io/mail.tm-api) -- inferred from browser JS libraries (`@cemalgnlts/mailjs` CDN tags) and client-side fetch examples, not directly tested from `file://` origin
- [Guerrilla Mail API](https://www.guerrillamail.com/GuerrillaMailAPI.html) -- documented as receive-only, compose page exists on website but not in public API
- [Tailwind v4 browser package](https://tailkits.com/blog/tailwind-css-v4-cdn-setup/) -- works for dev, not recommended for production

### Reference (prior art)
- [Consumer Reports / PrivacyBot announcement](https://innovation.consumerreports.org/new-open-source-project-automates-data-deletion-requests-by-email/)
- [datarequests.org sample erasure letter](https://www.datarequests.org/blog/sample-letter-gdpr-erasure-request/) -- CC0 licensed templates
- [Preact 11 Beta](https://www.infoq.com/news/2025/09/preact-11-beta/) -- not production-ready, stay on 10.x
- [preact-htm-signals-standalone](https://github.com/mujahidfa/preact-htm-signals-standalone) -- community single-file bundle of Preact + HTM + Signals

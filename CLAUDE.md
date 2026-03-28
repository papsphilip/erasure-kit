<!-- GSD:project-start source:PROJECT.md -->
## Project

**ErasureKit**

A free, open-source portable web app that automates GDPR Article 17 data erasure requests for Europeans. Users enter minimal identity info, the app creates a temporary email address, sends legally-compliant erasure requests to all known data brokers in one click, monitors responses, tracks 30-day compliance deadlines, and flags overdue brokers. Once all brokers respond, the temp email is deleted. No servers, no accounts, no tracking — everything runs in the browser.

**Core Value:** One-click automated data erasure across all known brokers without exposing the user's real email address.

### Constraints

- **No server**: Must work entirely client-side. All API calls (temp email, etc.) from browser.
- **Free APIs only**: Temp email service must be free, no API keys needed for basic usage.
- **CORS**: Temp email API must allow browser-origin requests, or we need a workaround.
- **Portable**: Single HTML/JS bundle or small set of static files. No build step for end users.
- **Privacy**: App must never phone home, track users, or store data externally.
- **Legal accuracy**: Email templates must cite correct GDPR articles and use legally appropriate language.
- **File System API**: For local save/load — only works in Chromium browsers (Chrome, Edge, Brave). Fallback: download/upload JSON.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Critical Finding: mail.tm Cannot Send Emails
### Revised Email Architecture
| Approach | How It Works | Tradeoff |
|----------|-------------|----------|
| **`mailto:` links** (recommended) | Generate pre-filled `mailto:` URIs, open user's email client | User clicks per broker (or batch), uses their own email |
| **EmailJS** | Third-party relay service, 200 emails/month free | Requires account setup, API key in client code, 200/month limit |
| **SMTP.js** | Proxies through smtpjs.com to an SMTP server | Credentials exposed in client, poor deliverability, not truly serverless |
### What Happens to mail.tm?
## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Preact | 10.29.0 | UI framework | 3KB gzipped, React-compatible API, component model with hooks. The standard choice for portable single-file web apps. |
| HTM | 3.1.1 | JSX alternative (tagged templates) | No build step, no transpiler, works directly in browser. Under 1KB. |
| Preact Signals | 1.3.x | Reactive state management | Fine-grained reactivity without hooks boilerplate. 1.6KB. Better than Zustand for no-build apps. |
### Styling
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @tailwindcss/browser | 4.x | Utility CSS in browser (dev mode) | JIT compilation in browser, no build step, one `<script>` tag |
| @tailwindcss/vite | 4.x | Optimized CSS (build mode) | Pre-compiled, tree-shaken CSS for production single-file output |
- **Development:** `@tailwindcss/browser` CDN script (~300KB) provides all Tailwind classes without a build step. Edit and refresh.
- **Production build:** `@tailwindcss/vite` compiles only used classes into a static CSS file (~15-25KB), which gets inlined by vite-plugin-singlefile.
### Email Sending
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `mailto:` URIs | (browser native) | Primary email sending | Zero dependencies, works offline, no credentials, no CORS, no accounts |
| EmailJS | 4.x | Optional automated sending | 200 emails/month free, browser-native, handles CORS internally |
### Email Monitoring
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| mail.tm REST API | v1 | Temp inbox for broker responses | Free, no API key, supports SSE for real-time, browser JS libraries exist |
- `GET /domains` -- list available temp email domains
- `POST /accounts` -- create temp inbox (address + password)
- `POST /token` -- get auth bearer token
- `GET /messages` -- poll for broker responses
- `GET /messages/{id}` -- fetch full message content
- `DELETE /accounts/{id}` -- delete temp account when done
### File Persistence
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| browser-fs-access | 0.35.0 | Save/load progress to local JSON | Google ChromeLabs ponyfill, File System Access API with automatic fallback |
- Chromium (Chrome, Edge, Brave): Uses native `showSaveFilePicker()`/`showOpenFilePicker()` -- direct file read/write without re-selecting
- Firefox/Safari: Falls back to `<input type="file">` for open and `<a download>` blob for save
- Zero-config: Call `fileOpen()` and `fileSave()`, library handles detection
- User identity info (name, emails to erase)
- Broker list with per-broker send status and timestamps
- mail.tm temp inbox credentials (for session continuity)
- Cached message content from broker responses
- App version for future migration compatibility
### Bundling (Distribution Build)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | 7.x | Dev server + production bundler | Fast HMR, Preact ecosystem standard. v7 chosen for plugin compatibility. |
| vite-plugin-singlefile | 2.3.2 | Inline all JS/CSS into single HTML | Produces one portable `index.html` -- the entire app in one file |
| @preact/preset-vite | latest | Preact integration for Vite | Official Preact plugin, handles HTM/JSX, aliasing, devtools |
- `dist/index.html` -- complete app with all JS + CSS inlined (~50-100KB)
- `brokers.json` -- kept separate, loaded at runtime so the community can update it independently
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.x | Date arithmetic | Calendar-month deadline calculation (not naive 30-day addition). Lightweight, tree-shakeable. |
| `crypto.randomUUID()` | (browser native) | Unique IDs | Campaign IDs, broker tracking IDs. Native -- no library needed. Supported in all modern browsers. |
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
## Two-Mode Architecture
### 1. No-Build Mode (Development / Quick Edit)
- Open `index.html` directly in browser -- works immediately
- No npm, no node, no build step required
- Edit source files, refresh browser to see changes
- Ideal for contributors, quick testing, and learning the codebase
### 2. Build Mode (Distribution)
- Output: single `dist/index.html` (~50-100KB) with all JS + CSS inlined
- Minified, optimized, portable
- This is what gets released on GitHub and shared with users
### Vite Configuration
## CORS Strategy
### mail.tm API (Response Monitoring)
### Email Sending (mailto:)
### Email Sending (EmailJS, optional)
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
## Installation
### For End Users (Zero Install)
### For Developers / Contributors
# Option A: No-build development (immediate start)
# Just open src/index.html in a browser -- works instantly
# Option B: Vite dev server (HMR, better DX)
# Build single-file distribution
# Output: dist/index.html + brokers.json
## Prior Art: How Other Tools Handle Email
| Tool | Architecture | Email Method | Portable? |
|------|-------------|-------------|-----------|
| **PrivacyBot** (UC Berkeley) | React + Flask (Python) | OAuth into user's Gmail, sends via Google API | No (server required) |
| **JustVanish** (AnalogJ) | Go CLI | SMTP with user-configured credentials (currently disabled) | No (Go runtime) |
| **Eraser** (digisamroc) | Go + SQLite + Web UI | SMTP / SendGrid / Resend (user-configured) | Self-hosted only |
| **datarequests.org** | Static website | Generates letter text, user copies into their email | Yes |
| **ErasureKit** (this project) | Single HTML file | `mailto:` links + optional EmailJS | **Yes** |
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
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

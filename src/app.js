import { html } from 'htm/preact';
import { render } from 'preact';
import { currentPage } from './lib/router.js';

// Side-effect import: initializes theme effect (dark/light class toggling)
import './lib/theme.js';

// Side-effect import: initializes campaign auto-save effect
import './lib/campaign.js';

// Shell components
import { Header } from './components/Header.js';
import { Stepper } from './components/Stepper.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { Footer } from './components/Footer.js';
import { ToastContainer } from './components/Toast.js';

// Step pages
import { Identity } from './pages/Identity.js';
import { Brokers } from './pages/Brokers.js';
import { Track } from './pages/Track.js';

// Secondary pages
import { About } from './pages/About.js';

/** Set of page IDs that are wizard steps (show stepper bar) */
const WIZARD_STEPS = new Set(['identity', 'brokers', 'track']);

/**
 * Generic placeholder page for routes that will be implemented in future phases.
 * @param {{ title: string, phase: string }} props
 */
function PlaceholderPage({ title, phase }) {
  return html`
    <div class="max-w-2xl mx-auto px-4 py-16 text-center">
      <svg class="w-5 h-5 mx-auto mb-4 text-[var(--ek-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      <h1 class="text-xl font-semibold mb-2">${title}</h1>
      <p class="text-[var(--ek-text-muted)]">Coming in Phase ${phase}</p>
    </div>
  `;
}

/**
 * Root App component. Wires header, stepper, page routing, and footer.
 * Uses signal-based routing via currentPage signal.
 */
function App() {
  const page = currentPage.value;
  const showStepper = WIZARD_STEPS.has(page);

  return html`
    <div class="min-h-screen flex flex-col bg-[var(--ek-surface)] text-[var(--ek-text)]">
      <${Header} />
      ${showStepper && html`<${Stepper} />`}
      <main class="flex-1">
        ${page === 'welcome' && html`<${WelcomeScreen} />`}
        ${page === 'identity' && html`<${Identity} />`}
        ${page === 'brokers' && html`<${Brokers} />`}
        ${page === 'track' && html`<${Track} />`}
        ${page === 'about' && html`<${About} />`}
        ${page === 'legal' && html`<${PlaceholderPage} title="Legal Reference" phase="7" />`}
        ${page === 'escalation' && html`<${PlaceholderPage} title="Escalation" phase="8" />`}
      </main>
      <${Footer} />
      <${ToastContainer} />
    </div>
  `;
}

// Mount the app
render(html`<${App} />`, document.getElementById('app'));

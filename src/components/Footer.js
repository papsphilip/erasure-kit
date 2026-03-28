import { html } from 'htm/preact';
import { navigateTo } from '../lib/router.js';

/**
 * Footer with navigation links to Legal Reference and About pages.
 * Height 48px (h-12), top border divider.
 */
export function Footer() {
  return html`
    <footer class="h-12 flex items-center justify-center gap-4 px-4 border-t border-[var(--ek-border)] text-sm text-[var(--ek-text-muted)]">
      <button
        onClick=${() => navigateTo('legal')}
        class="hover:text-[var(--ek-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none"
      >
        Legal Reference
      </button>
      <button
        onClick=${() => navigateTo('about')}
        class="hover:text-[var(--ek-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none"
      >
        About
      </button>
    </footer>
  `;
}

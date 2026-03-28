import { html } from 'htm/preact';
import { isDark, toggleTheme } from '../lib/theme.js';

/**
 * Dark/light mode toggle button with sun/moon SVG icons.
 * Uses isDark signal for reactive state and toggleTheme for switching.
 */
export function ThemeToggle() {
  return html`
    <button
      onClick=${toggleTheme}
      class="w-10 h-10 rounded-lg flex items-center justify-center bg-transparent text-[var(--ek-text-muted)] hover:bg-[var(--ek-surface-alt)] hover:text-[var(--ek-primary)] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface)] outline-none"
      aria-label=${isDark.value ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      ${isDark.value
        ? html`<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>`
        : html`<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
      }
    </button>
  `;
}

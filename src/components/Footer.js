import { html } from 'htm/preact';
import { signal, effect } from '@preact/signals';
import { navigateTo } from '../lib/router.js';
import { lastAutoSaved } from '../lib/campaign.js';

/** Controls visibility of the auto-save indicator (fades after 2 seconds per D-16) */
const showAutoSaved = signal(false);
let fadeTimeout = null;

effect(() => {
  if (lastAutoSaved.value) {
    showAutoSaved.value = true;
    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => { showAutoSaved.value = false; }, 2000);
  }
});

/**
 * Footer with auto-save indicator, Legal Reference and About navigation.
 * Height 48px (h-12), top border divider.
 * Three-column layout: auto-save indicator | nav links | spacer (balanced).
 */
export function Footer() {
  return html`
    <footer class="h-14 flex items-center justify-between px-4 border-t border-[var(--ek-border)] text-base text-[var(--ek-text-muted)]">
      <div class="w-32 flex items-center gap-1.5 transition-opacity duration-300 ${showAutoSaved.value ? 'opacity-100' : 'opacity-0'}">
        <svg class="w-4 h-4 text-[var(--ek-success)]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
        <span class="text-sm">Auto-saved</span>
      </div>
      <div class="flex items-center gap-4">
        <button
          onClick=${() => navigateTo('welcome')}
          class="hover:text-[var(--ek-primary)] transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 rounded outline-none"
        >
          Home
        </button>
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
      </div>
      <div class="w-32"></div>
    </footer>
  `;
}

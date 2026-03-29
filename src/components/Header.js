import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { ThemeToggle } from './ThemeToggle.js';
import { HamburgerMenu } from './HamburgerMenu.js';
import { saveCampaignToFile, loadCampaignFromFile } from '../lib/campaign.js';

/** Error message for failed file loads, auto-clears after 5 seconds */
const loadError = signal(null);

/**
 * Handle Load button click -- opens file picker and shows error on failure.
 * Per D-18: friendly error messages, never crash, never overwrite localStorage with bad data.
 */
async function handleLoad() {
  loadError.value = null;
  const result = await loadCampaignFromFile();
  if (result && result.error === 'invalid') {
    loadError.value = "This file doesn't appear to be a valid ErasureKit campaign";
  } else if (result && result.error === 'parse') {
    loadError.value = "Could not read this file. Try another.";
  }
  // cancelled and success: no action needed
  if (loadError.value) {
    setTimeout(() => { loadError.value = null; }, 5000);
  }
}

/**
 * Sticky header with brand text, Save/Load buttons, theme toggle, and hamburger menu.
 * Height 56px (h-14), secondary surface background.
 * Save/Load buttons per D-14 -- always visible from any page.
 */
export function Header() {
  return html`
    <div>
      <header class="sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-[var(--ek-surface-alt)] border-b border-[var(--ek-border)]">
        <span class="text-xl font-semibold text-[var(--ek-primary)]">ErasureKit</span>
        <div class="flex items-center gap-1">
          <button
            onClick=${saveCampaignToFile}
            class="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors"
            aria-label="Save campaign to file"
            title="Save to file"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
          <button
            onClick=${handleLoad}
            class="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors"
            aria-label="Load campaign from file"
            title="Load from file"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <${ThemeToggle} />
          <${HamburgerMenu} />
        </div>
      </header>
      ${loadError.value && html`
        <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[var(--ek-danger)] text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span>${loadError.value}</span>
          <button onClick=${() => { loadError.value = null; }} class="text-white/80 hover:text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      `}
    </div>
  `;
}

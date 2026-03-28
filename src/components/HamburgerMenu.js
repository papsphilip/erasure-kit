import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { navigateTo } from '../lib/router.js';

const isOpen = signal(false);

const MENU_ITEMS = [
  { label: 'Legal Reference', page: 'legal' },
  { label: 'Escalation', page: 'escalation' },
  { label: 'About', page: 'about' },
];

/**
 * Slide-in secondary navigation panel with backdrop overlay.
 * Opens from the right edge with 280px width.
 */
export function HamburgerMenu() {
  const panelRef = useRef(null);

  // Handle Escape key to close menu
  useEffect(() => {
    if (!isOpen.value) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        isOpen.value = false;
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen.value]);

  function handleItemClick(page) {
    navigateTo(page);
    isOpen.value = false;
  }

  return html`
    <button
      onClick=${() => { isOpen.value = true; }}
      class="w-10 h-10 rounded-lg flex items-center justify-center bg-transparent text-[var(--ek-text-muted)] hover:bg-[var(--ek-surface-alt)] hover:text-[var(--ek-primary)] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface)] outline-none"
      aria-expanded=${isOpen.value}
      aria-label="Menu"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>

    ${isOpen.value && html`
      <!-- Backdrop overlay -->
      <div
        class="fixed inset-0 bg-black/50 z-40"
        onClick=${() => { isOpen.value = false; }}
      />

      <!-- Slide-in panel -->
      <div
        ref=${panelRef}
        class="fixed top-0 right-0 h-full w-[280px] bg-[var(--ek-surface-alt)] z-50 rounded-l-xl shadow-xl transform transition-transform duration-200 ease-out translate-x-0"
      >
        <!-- Panel header with close button -->
        <div class="flex items-center justify-end p-4">
          <button
            onClick=${() => { isOpen.value = false; }}
            class="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ek-text-muted)] hover:bg-[var(--ek-surface)] hover:text-[var(--ek-text)] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 outline-none"
            aria-label="Close menu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Menu items -->
        <nav class="px-3">
          ${MENU_ITEMS.map(item => html`
            <button
              key=${item.page}
              onClick=${() => handleItemClick(item.page)}
              class="w-full h-12 flex items-center px-4 rounded-lg text-[var(--ek-text)] hover:bg-[var(--ek-surface)] transition-colors duration-150 text-sm font-medium focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
            >
              ${item.label}
            </button>
          `)}
        </nav>
      </div>
    `}
  `;
}

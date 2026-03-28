import { html } from 'htm/preact';
import { ThemeToggle } from './ThemeToggle.js';
import { HamburgerMenu } from './HamburgerMenu.js';

/**
 * Sticky header with brand text, theme toggle, and hamburger menu.
 * Height 56px (h-14), secondary surface background.
 */
export function Header() {
  return html`
    <header class="sticky top-0 z-30 h-14 flex items-center justify-between px-4 bg-[var(--ek-surface-alt)] border-b border-[var(--ek-border)]">
      <span class="text-xl font-semibold text-[var(--ek-primary)]">ErasureKit</span>
      <div class="flex items-center gap-1">
        <${ThemeToggle} />
        <${HamburgerMenu} />
      </div>
    </header>
  `;
}

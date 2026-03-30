import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { campaign } from '../lib/campaign.js';
import { generateGDPR } from '../lib/template-engine.js';

// ── Local UI State ────────────────────────────────────────────────────────────

/** Whether the template drawer is expanded */
const drawerOpen = signal(false);

// ── SVG Icons ────────────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return html`
    <svg
      class="w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : '-rotate-90'}"
      fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  `;
}

function DocumentIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  `;
}

// ── TemplateDrawer Component ─────────────────────────────────────────────────

/**
 * Expandable drawer at the top of the Brokers page showing a general
 * GDPR template preview. Collapsed by default with a clickable bar.
 * D-01: General/base template at the top of Brokers page.
 */
export function TemplateDrawer() {
  const identity = campaign.value.identity;
  const hasIdentity = identity.fullName && identity.fullName.trim();

  function handleToggle() {
    drawerOpen.value = !drawerOpen.value;
  }

  // Generate preview using GDPR template with placeholder broker name
  let previewBody = '';
  if (hasIdentity) {
    const result = generateGDPR(identity, { name: '[Broker Name]', legalFramework: 'GDPR' });
    previewBody = result.body;
  }

  return html`
    <div class="border-b border-[var(--ek-border)]">
      ${/* Clickable header bar */''}
      <button
        type="button"
        class="w-full px-4 py-3 flex items-center justify-between bg-[var(--ek-surface-alt)] hover:bg-[var(--ek-surface)]/50 transition-colors duration-150 cursor-pointer"
        onClick=${handleToggle}
        aria-expanded=${drawerOpen.value}
      >
        <div class="flex items-center gap-2 text-sm font-medium text-[var(--ek-text)]">
          <${DocumentIcon} />
          <span>Template Preview</span>
        </div>
        <${ChevronIcon} open=${drawerOpen.value} />
      </button>

      ${/* Expandable body */''}
      ${drawerOpen.value && html`
        <div class="px-4 pb-4">
          ${hasIdentity
            ? html`
              <p class="text-xs text-[var(--ek-text-muted)] mb-2">
                Base GDPR template shown below. UK and US brokers receive adapted versions with region-specific legal citations.
              </p>
              <pre class="whitespace-pre-wrap break-words text-sm text-[var(--ek-text)] bg-[var(--ek-surface)] p-4 rounded-lg max-h-96 overflow-y-auto font-mono leading-relaxed">${previewBody}</pre>
            `
            : html`
              <p class="text-sm text-[var(--ek-text-muted)] py-4 text-center">
                Enter your identity information first to see personalized templates.
              </p>
            `
          }
        </div>
      `}
    </div>
  `;
}

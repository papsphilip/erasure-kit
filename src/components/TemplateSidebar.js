import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { campaign } from '../lib/campaign.js';
import {
  getTemplateForBroker,
  saveCustomTemplate,
  resetBrokerTemplate,
} from '../lib/template-engine.js';
import { copyToClipboard } from '../lib/clipboard.js';

// ── Exported Sidebar State ───────────────────────────────────────────────────

/** Whether the sidebar is open */
export const sidebarOpen = signal(false);

/** ID of the broker currently displayed in the sidebar */
export const activeBrokerId = signal(null);

/**
 * Open the sidebar for a specific broker.
 * @param {string} brokerId - The broker ID slug
 */
export function openSidebar(brokerId) {
  activeBrokerId.value = brokerId;
  sidebarOpen.value = true;
}

/**
 * Close the sidebar and clear the active broker.
 */
export function closeSidebar() {
  sidebarOpen.value = false;
  activeBrokerId.value = null;
}

// ── Internal State ───────────────────────────────────────────────────────────

/** Whether the "Copied!" feedback is showing */
const copiedFeedback = signal(false);

/** Timeout ID for clearing copied feedback */
let _copiedTimeout = null;

/** Debounce timeout for save */
let _saveTimeout = null;

// ── SVG Icons ────────────────────────────────────────────────────────────────

function CloseIcon() {
  return html`
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
}

function CopyIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  `;
}

function ResetIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  `;
}

// ── TemplateSidebar Component ─────────────────────────────────────────────────

/**
 * Right slide-in panel showing per-broker template preview/edit.
 * D-02: Slides in from right, table stays visible on left.
 * D-03: Shows To, Subject, and editable Body.
 * D-08: Editable textarea for body text.
 * D-09: Edits persist per broker in campaign.brokers.templates.
 * D-10: Editing one broker does NOT affect others.
 * D-11: "Reset to default" discards per-broker edits.
 * D-12: "Copy to clipboard" button.
 * D-13: "Copied!" inline feedback, fades after ~2 seconds.
 * D-14: No bulk copy -- per-broker copy only.
 *
 * @param {{ brokers: Array }} props - Full brokers array to look up active broker
 */
export function TemplateSidebar({ brokers }) {
  if (!sidebarOpen.value) return null;

  // Find the active broker
  const broker = (brokers || []).find((b) => b.id === activeBrokerId.value);
  if (!broker) {
    closeSidebar();
    return null;
  }

  // Get template (custom or generated)
  const identity = campaign.value.identity;
  const customTemplates = campaign.value.brokers.templates || {};
  const { subject, body, isCustom } = getTemplateForBroker(identity, broker, customTemplates);

  // Handle textarea input with debounced save
  function handleBodyInput(e) {
    const newBody = e.target.value;
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
      saveCustomTemplate(broker.id, newBody);
    }, 300);
  }

  // Handle reset to default
  function handleReset() {
    resetBrokerTemplate(broker.id);
  }

  // Handle copy to clipboard
  async function handleCopy() {
    // Get the current textarea value (may include unsaved edits)
    const textarea = document.querySelector('[data-ek-template-body]');
    const textToCopy = textarea ? textarea.value : body;
    const success = await copyToClipboard(textToCopy);
    if (success) {
      if (_copiedTimeout) clearTimeout(_copiedTimeout);
      copiedFeedback.value = true;
      _copiedTimeout = setTimeout(() => {
        copiedFeedback.value = false;
      }, 2000);
    }
  }

  // Handle backdrop click (mobile close)
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      closeSidebar();
    }
  }

  // Legal framework badge text
  const frameworkLabel = broker.legalFramework === 'UK-GDPR' ? 'UK GDPR'
    : broker.legalFramework === 'CCPA' ? 'CCPA'
    : 'GDPR';

  return html`
    ${/* Mobile backdrop */''}
    <div
      class="fixed inset-0 z-30 sm:pointer-events-none"
      onClick=${handleBackdropClick}
    >
      <div class="absolute inset-0 bg-black/30 sm:hidden" onClick=${handleBackdropClick}></div>

      ${/* Sidebar panel */''}
      <div class="absolute top-0 right-0 h-full w-full sm:w-[420px] lg:w-[480px] bg-[var(--ek-surface-alt)] shadow-2xl border-l border-[var(--ek-border)] flex flex-col pointer-events-auto">

        ${/* Header bar */''}
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--ek-border)] flex-shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <h3 class="text-sm font-semibold text-[var(--ek-text)] truncate">${broker.name}</h3>
            <span class="text-xs px-1.5 py-0.5 rounded bg-[var(--ek-primary)]/15 text-[var(--ek-primary)] font-medium flex-shrink-0">${frameworkLabel}</span>
          </div>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors duration-150 flex-shrink-0"
            onClick=${closeSidebar}
            aria-label="Close sidebar"
          >
            <${CloseIcon} />
          </button>
        </div>

        ${/* To field */''}
        <div class="px-4 py-2 text-sm border-b border-[var(--ek-border)]/50 flex-shrink-0">
          <span class="text-[var(--ek-text-muted)]">To: </span>
          <span class="text-[var(--ek-text)]">${broker.email}</span>
        </div>

        ${/* Subject field */''}
        <div class="px-4 py-2 text-sm border-b border-[var(--ek-border)] flex-shrink-0">
          <span class="text-[var(--ek-text-muted)]">Subject: </span>
          <span class="text-[var(--ek-text)] font-medium">${subject}</span>
        </div>

        ${/* Editable body textarea (D-08) */''}
        <div class="flex-1 overflow-hidden flex flex-col min-h-0">
          <textarea
            data-ek-template-body
            class="w-full flex-1 p-4 text-sm font-mono bg-[var(--ek-surface)] text-[var(--ek-text)] border-none resize-none focus:outline-none leading-relaxed"
            value=${body}
            onInput=${handleBodyInput}
            spellcheck="false"
          ></textarea>
        </div>

        ${/* Action bar */''}
        <div class="flex items-center justify-between px-4 py-3 border-t border-[var(--ek-border)] flex-shrink-0 gap-2">
          <div class="flex items-center gap-2">
            ${isCustom && html`
              <button
                type="button"
                class="flex items-center gap-1 text-sm text-[var(--ek-text-muted)] hover:text-[var(--ek-danger)] transition-colors duration-150"
                onClick=${handleReset}
                title="Reset to default template"
              >
                <${ResetIcon} />
                <span>Reset to default</span>
              </button>
            `}
          </div>
          <div class="flex items-center gap-2">
            ${copiedFeedback.value && html`
              <span class="text-xs text-[var(--ek-success)] font-medium transition-opacity duration-300">Copied!</span>
            `}
            <button
              type="button"
              class="flex items-center gap-1.5 bg-[var(--ek-primary)] text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-90 active:brightness-85 transition-all duration-150"
              onClick=${handleCopy}
              title="Copy to clipboard"
            >
              <${CopyIcon} />
              <span>Copy to clipboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

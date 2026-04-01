import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { campaign } from '../lib/campaign.js';
import {
  getTemplateForBroker,
  saveCustomTemplate,
  resetBrokerTemplate,
} from '../lib/template-engine.js';
import { copyToClipboard } from '../lib/clipboard.js';
import { getBrokerStatusValue, markBrokerSent, STATUS } from '../lib/status-tracker.js';

// ── Exported Modal State ────────────────────────────────────────────────────

/** Whether the modal is open */
export const modalOpen = signal(false);

/** ID of the broker currently displayed in the modal */
export const activeBrokerId = signal(null);

/** The list of brokers to navigate through (current filtered view) */
const modalBrokerList = signal([]);

/**
 * Open the modal for a specific broker.
 * @param {string} brokerId - The broker ID slug
 * @param {Array} brokerList - Full broker list for navigation
 */
export function openModal(brokerId, brokerList) {
  activeBrokerId.value = brokerId;
  modalBrokerList.value = brokerList || [];
  modalOpen.value = true;
}

/**
 * Close the modal and clear state.
 */
export function closeModal() {
  modalOpen.value = false;
  activeBrokerId.value = null;
}

// ── Internal State ──────────────────────────────────────────────────────────

/** Whether the "Copied!" feedback is showing */
const copiedFeedback = signal(false);

/** Timeout ID for clearing copied feedback */
let _copiedTimeout = null;

/** Debounce timeout for save */
let _saveTimeout = null;

// ── Navigation Helpers ──────────────────────────────────────────────────────

function getCurrentIndex() {
  const list = modalBrokerList.value;
  return list.findIndex((b) => b.id === activeBrokerId.value);
}

function navigatePrev() {
  const list = modalBrokerList.value;
  const idx = getCurrentIndex();
  if (idx > 0) {
    activeBrokerId.value = list[idx - 1].id;
  } else if (list.length > 0) {
    // Wrap around to last
    activeBrokerId.value = list[list.length - 1].id;
  }
}

function navigateNext() {
  const list = modalBrokerList.value;
  const idx = getCurrentIndex();
  if (idx < list.length - 1) {
    activeBrokerId.value = list[idx + 1].id;
  } else if (list.length > 0) {
    // Wrap around to first
    activeBrokerId.value = list[0].id;
  }
}

// ── SVG Icons ───────────────────────────────────────────────────────────────

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

function SendIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  `;
}

function ArrowLeftIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  `;
}

function ArrowRightIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  `;
}

function ExternalLinkIcon() {
  return html`
    <svg class="w-3.5 h-3.5 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  `;
}

// ── TemplateModal Component ─────────────────────────────────────────────────

/**
 * Centered modal showing broker details and template preview/edit (D-16 through D-22).
 * max-w-3xl (768px), full-screen on mobile.
 * Navigation arrows cycle through brokers in current filtered view.
 */
export function TemplateModal() {
  if (!modalOpen.value) return null;

  const list = modalBrokerList.value;
  const broker = list.find((b) => b.id === activeBrokerId.value);
  if (!broker) {
    closeModal();
    return null;
  }

  const currentIdx = getCurrentIndex();
  const total = list.length;

  // Get template (custom or generated)
  const identity = campaign.value.identity;
  const customTemplates = campaign.value.brokers.templates || {};
  const { subject, body, isCustom } = getTemplateForBroker(identity, broker, customTemplates);

  // Get broker send status
  const brokerStatus = getBrokerStatusValue(broker.id);
  const isSent = brokerStatus === STATUS.AWAITING || brokerStatus === STATUS.CONFIRMED ||
    brokerStatus === STATUS.REJECTED || brokerStatus === STATUS.OVERDUE || brokerStatus === STATUS.ESCALATED;

  // Check if identity is filled (needed for sending)
  const hasIdentity = identity.fullName && identity.fullName.trim() &&
    identity.emails.some((e) => e && e.trim());

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
    const textarea = document.querySelector('[data-ek-template-body]');
    const textToCopy = textarea ? textarea.value : body;
    const fullText = `To: ${broker.email}\nSubject: ${subject}\n\n${textToCopy}`;
    const success = await copyToClipboard(fullText);
    if (success) {
      if (_copiedTimeout) clearTimeout(_copiedTimeout);
      copiedFeedback.value = true;
      _copiedTimeout = setTimeout(() => {
        copiedFeedback.value = false;
      }, 2000);
    }
  }

  // Handle send via mailto
  function handleSend() {
    if (!hasIdentity) return;

    const textarea = document.querySelector('[data-ek-template-body]');
    const bodyText = textarea ? textarea.value : body;

    // Check mailto: URL length limit (~2000 chars)
    const mailtoUrl = `mailto:${encodeURIComponent(broker.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

    if (mailtoUrl.length > 2000) {
      // Fallback to clipboard copy with instructions (SEND-04)
      const fullText = `To: ${broker.email}\nSubject: ${subject}\n\n${bodyText}`;
      copyToClipboard(fullText).then((success) => {
        if (success) {
          if (_copiedTimeout) clearTimeout(_copiedTimeout);
          copiedFeedback.value = true;
          _copiedTimeout = setTimeout(() => {
            copiedFeedback.value = false;
          }, 3000);
        }
      });
      // Still mark as sent
      markBrokerSent(broker.id);
      return;
    }

    // Open mailto: link
    window.open(mailtoUrl, '_self');
    markBrokerSent(broker.id);
  }

  // Handle backdrop click (D-21)
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  }

  // Handle Esc key (D-21)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    }
    if (modalOpen.value) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [modalOpen.value]);

  // Legal framework badge
  const frameworkLabel = broker.legalFramework === 'UK-GDPR' ? 'UK GDPR'
    : broker.legalFramework === 'CCPA' ? 'CCPA'
    : 'GDPR';

  // Temp email status display
  const tempEmailLabel = broker.tempEmailAccepted === true ? 'Accepted'
    : broker.tempEmailAccepted === false ? 'May block'
    : 'Unknown';
  const tempEmailColor = broker.tempEmailAccepted === true
    ? 'text-emerald-500'
    : broker.tempEmailAccepted === false
      ? 'text-amber-500'
      : 'text-[var(--ek-text-muted)]';

  return html`
    ${/* Backdrop */''}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick=${handleBackdropClick}
    >
      ${/* Modal panel */''}
      <div class="relative w-full max-w-3xl max-h-[90vh] bg-[var(--ek-surface-alt)] rounded-xl shadow-2xl border border-[var(--ek-border)] flex flex-col overflow-hidden">

        ${/* Header with navigation (D-19) */''}
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--ek-border)] flex-shrink-0">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors duration-150"
              onClick=${navigatePrev}
              aria-label="Previous broker"
              title="Previous broker"
            >
              <${ArrowLeftIcon} />
            </button>
            <div class="flex items-center gap-2 min-w-0">
              <h3 class="text-sm font-semibold text-[var(--ek-text)] truncate">${broker.name}</h3>
              <span class="text-xs text-[var(--ek-text-muted)] flex-shrink-0">(${currentIdx + 1}/${total})</span>
              <span class="text-xs px-1.5 py-0.5 rounded bg-[var(--ek-primary)]/15 text-[var(--ek-primary)] font-medium flex-shrink-0">${frameworkLabel}</span>
              ${isSent && html`
                <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500 font-medium flex-shrink-0">Sent</span>
              `}
            </div>
            <button
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors duration-150"
              onClick=${navigateNext}
              aria-label="Next broker"
              title="Next broker"
            >
              <${ArrowRightIcon} />
            </button>
          </div>
          <button
            type="button"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors duration-150 flex-shrink-0"
            onClick=${closeModal}
            aria-label="Close modal"
          >
            <${CloseIcon} />
          </button>
        </div>

        ${/* Broker metadata (D-18) */''}
        <div class="px-4 py-3 border-b border-[var(--ek-border)]/50 flex-shrink-0">
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div>
              <span class="text-[var(--ek-text-muted)] text-xs block">Email</span>
              <span class="text-[var(--ek-text)] break-all">${broker.email}</span>
            </div>
            <div>
              <span class="text-[var(--ek-text-muted)] text-xs block">Region</span>
              <span class="text-[var(--ek-text)]">${broker.region}</span>
            </div>
            <div>
              <span class="text-[var(--ek-text-muted)] text-xs block">Temp Email</span>
              <span class="${tempEmailColor}">${tempEmailLabel}</span>
            </div>
            ${broker.privacyPortalUrl && html`
              <div class="col-span-2 sm:col-span-3">
                <span class="text-[var(--ek-text-muted)] text-xs block">Privacy Portal</span>
                <a href=${broker.privacyPortalUrl} target="_blank" rel="noopener noreferrer" class="text-[var(--ek-primary)] hover:underline break-all text-sm">
                  ${broker.privacyPortalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  <${ExternalLinkIcon} />
                </a>
              </div>
            `}
            ${broker.notes && html`
              <div class="col-span-2 sm:col-span-3">
                <span class="text-[var(--ek-text-muted)] text-xs block">Notes</span>
                <span class="text-[var(--ek-text)] text-sm">${broker.notes}</span>
              </div>
            `}
          </div>
        </div>

        ${/* To field */''}
        <div class="px-4 py-2 text-sm border-b border-[var(--ek-border)]/30 flex-shrink-0">
          <span class="text-[var(--ek-text-muted)]">To: </span>
          <span class="text-[var(--ek-text)]">${broker.email}</span>
        </div>

        ${/* Subject field */''}
        <div class="px-4 py-2 text-sm border-b border-[var(--ek-border)]/30 flex-shrink-0">
          <span class="text-[var(--ek-text-muted)]">Subject: </span>
          <span class="text-[var(--ek-text)] font-medium">${subject}</span>
        </div>

        ${/* Editable body textarea */''}
        <div class="flex-1 overflow-hidden flex flex-col min-h-0" style="min-height: 200px;">
          <textarea
            data-ek-template-body
            class="w-full flex-1 p-4 text-sm font-mono bg-[var(--ek-surface)] text-[var(--ek-text)] border-none resize-none focus:outline-none leading-relaxed"
            value=${body}
            onInput=${handleBodyInput}
            spellcheck="false"
          ></textarea>
        </div>

        ${/* Action bar (D-20) */''}
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
                <span class="hidden sm:inline">Reset</span>
              </button>
            `}
          </div>
          <div class="flex items-center gap-2">
            ${copiedFeedback.value && html`
              <span class="text-xs text-[var(--ek-success)] font-medium">Copied!</span>
            `}
            <button
              type="button"
              class="flex items-center gap-1.5 bg-[var(--ek-surface)] text-[var(--ek-text)] px-3 py-2 rounded-lg text-sm font-medium border border-[var(--ek-border)] hover:bg-[var(--ek-surface-alt)] transition-all duration-150"
              onClick=${handleCopy}
              title="Copy to clipboard"
            >
              <${CopyIcon} />
              <span class="hidden sm:inline">Copy</span>
            </button>
            <button
              type="button"
              class="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                hasIdentity && !isSent
                  ? 'bg-[var(--ek-primary)] text-white hover:brightness-90 active:brightness-85 cursor-pointer'
                  : isSent
                    ? 'bg-emerald-500/20 text-emerald-500 cursor-default'
                    : 'bg-[var(--ek-primary)]/40 text-white/60 cursor-not-allowed'
              }"
              onClick=${hasIdentity && !isSent ? handleSend : undefined}
              disabled=${!hasIdentity || isSent}
              title=${!hasIdentity ? 'Complete Identity step first' : isSent ? 'Already sent' : 'Send erasure request'}
            >
              <${SendIcon} />
              <span>${isSent ? 'Sent' : 'Send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

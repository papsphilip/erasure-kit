import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { campaign, updateIdentity, updateIdentityEmail, addEmail, removeEmail } from '../lib/campaign.js';
import { navigateTo, markStepComplete } from '../lib/router.js';

// ── Local UI State (not persisted to campaign) ────────────────────────────────

const errors = signal({});
const showOptional = signal(false);

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

function hasAtLeastOneValidEmail() {
  return campaign.value.identity.emails.some(
    (e) => e.trim() !== '' && isValidEmail(e),
  );
}

// ── Event Handlers ────────────────────────────────────────────────────────────

function handleNameInput(e) {
  updateIdentity('fullName', e.target.value);
}

function handleNameBlur(e) {
  const value = e.target.value.trim();
  if (value === '') {
    errors.value = { ...errors.value, fullName: 'Full name is required' };
  } else {
    const next = { ...errors.value };
    delete next.fullName;
    errors.value = next;
  }
}

function handleEmailInput(index, e) {
  updateIdentityEmail(index, e.target.value);
}

function handleEmailBlur(index, e) {
  const value = e.target.value.trim();
  const key = `email-${index}`;
  if (value !== '' && !isValidEmail(value)) {
    errors.value = { ...errors.value, [key]: 'Please enter a valid email address' };
  } else {
    const next = { ...errors.value };
    delete next[key];
    errors.value = next;
  }
}

function handleRemoveEmail(index) {
  removeEmail(index);
  // Clear any error for the removed index
  const next = { ...errors.value };
  delete next[`email-${index}`];
  errors.value = next;
}

function handleContinue() {
  markStepComplete('identity');
  navigateTo('brokers');
}

// ── Lock Icon SVG ─────────────────────────────────────────────────────────────

function LockIcon() {
  return html`
    <svg class="w-4 h-4 text-[var(--ek-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  `;
}

// ── Chevron Icon SVG ──────────────────────────────────────────────────────────

function ChevronIcon({ open }) {
  return html`
    <svg
      class="w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  `;
}

// ── X (Remove) Icon SVG ───────────────────────────────────────────────────────

function XIcon() {
  return html`
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
}

// ── Input Class Helpers ───────────────────────────────────────────────────────

const BASE_INPUT_CLASSES = 'w-full h-12 px-4 rounded-lg bg-[var(--ek-surface)] border text-[var(--ek-text)] placeholder:text-[var(--ek-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ek-primary)]';
const BORDER_NORMAL = 'border-[var(--ek-border)]';
const BORDER_ERROR = 'border-[var(--ek-danger)]';

// ── Identity Page Component ───────────────────────────────────────────────────

/**
 * Identity form: name, emails, optional phone/address, Continue button.
 * Writes directly to the campaign signal (triggers auto-save via Plan 01).
 */
export function Identity() {
  const identity = campaign.value.identity;
  const errs = errors.value;
  const emails = identity.emails;
  const canContinue =
    identity.fullName.trim() !== '' && hasAtLeastOneValidEmail();

  return html`
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="rounded-xl bg-[var(--ek-surface-alt)] shadow-lg p-6 space-y-6">

        ${/* ── Card Header ─────────────────────────────────────── */''}
        <div>
          <h2 class="text-xl font-semibold text-[var(--ek-text)]">Your Information</h2>
          <div class="flex items-center gap-1.5 mt-1">
            <${LockIcon} />
            <span class="text-xs text-[var(--ek-text-muted)]">Your data never leaves this device</span>
          </div>
        </div>

        ${/* ── Full Name ───────────────────────────────────────── */''}
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--ek-text)]">Full Name</label>
          <p class="text-xs text-[var(--ek-text-muted)]">Included in erasure requests to identify your records</p>
          <input
            type="text"
            class="${BASE_INPUT_CLASSES} ${errs.fullName ? BORDER_ERROR : BORDER_NORMAL}"
            placeholder="Your full name"
            value=${identity.fullName}
            onInput=${handleNameInput}
            onBlur=${handleNameBlur}
          />
          ${errs.fullName && html`
            <p class="text-xs text-[var(--ek-danger)] mt-1">${errs.fullName}</p>
          `}
        </div>

        ${/* ── Email Addresses ─────────────────────────────────── */''}
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-[var(--ek-text)]">Email Addresses to Erase</label>
          <p class="text-xs text-[var(--ek-text-muted)]">Brokers erase data linked to these addresses</p>
          <div class="space-y-2">
            ${emails.map(
              (email, index) => html`
                <div key=${index}>
                  <div class="flex items-center gap-2">
                    <input
                      type="email"
                      class="${BASE_INPUT_CLASSES} flex-1 ${errs[`email-${index}`] ? BORDER_ERROR : BORDER_NORMAL}"
                      placeholder="email@example.com"
                      value=${email}
                      onInput=${(e) => handleEmailInput(index, e)}
                      onBlur=${(e) => handleEmailBlur(index, e)}
                    />
                    ${emails.length > 1 && html`
                      <button
                        type="button"
                        class="flex-shrink-0 w-10 h-12 flex items-center justify-center rounded-lg text-[var(--ek-text-muted)] hover:text-[var(--ek-danger)] hover:bg-[var(--ek-surface)] transition-colors duration-150"
                        onClick=${() => handleRemoveEmail(index)}
                        aria-label="Remove email"
                      >
                        <${XIcon} />
                      </button>
                    `}
                  </div>
                  ${errs[`email-${index}`] && html`
                    <p class="text-xs text-[var(--ek-danger)] mt-1">${errs[`email-${index}`]}</p>
                  `}
                </div>
              `,
            )}
          </div>
          <button
            type="button"
            class="text-sm text-[var(--ek-primary)] hover:underline mt-1"
            onClick=${addEmail}
          >
            + Add email
          </button>
          ${emails.length >= 10 && html`
            <p class="text-xs text-[var(--ek-text-muted)] italic mt-1">Most users need fewer than 10 addresses</p>
          `}
        </div>

        ${/* ── Optional: Phone & Address ───────────────────────── */''}
        <div>
          <button
            type="button"
            class="flex items-center gap-1.5 text-sm text-[var(--ek-text-muted)] hover:text-[var(--ek-primary)] transition-colors duration-150"
            onClick=${() => { showOptional.value = !showOptional.value; }}
          >
            <${ChevronIcon} open=${showOptional.value} />
            Optional: Phone & Address
          </button>

          ${showOptional.value && html`
            <div class="mt-4 space-y-4 pl-1">
              <div class="space-y-1.5">
                <label class="block text-sm font-medium text-[var(--ek-text)]">Phone Number</label>
                <input
                  type="tel"
                  class="${BASE_INPUT_CLASSES} ${BORDER_NORMAL}"
                  placeholder="+30 690 000 0000"
                  value=${identity.phone}
                  onInput=${(e) => updateIdentity('phone', e.target.value)}
                />
              </div>
              <div class="space-y-1.5">
                <label class="block text-sm font-medium text-[var(--ek-text)]">Postal Address</label>
                <textarea
                  rows="3"
                  class="${BASE_INPUT_CLASSES} h-auto py-3 ${BORDER_NORMAL}"
                  placeholder="Street address, city, postal code, country"
                  value=${identity.address}
                  onInput=${(e) => updateIdentity('address', e.target.value)}
                ></textarea>
              </div>
            </div>
          `}
        </div>

        ${/* ── Continue Button ─────────────────────────────────── */''}
        <button
          type="button"
          class="w-full h-12 rounded-lg font-semibold text-white transition-all duration-150 ${
            canContinue
              ? 'bg-[var(--ek-primary)] hover:brightness-90 active:brightness-85 cursor-pointer'
              : 'bg-[var(--ek-primary)]/40 cursor-not-allowed'
          }"
          disabled=${!canContinue}
          onClick=${canContinue ? handleContinue : undefined}
        >
          Continue
        </button>
      </div>
    </div>
  `;
}

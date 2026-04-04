import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { navigateTo } from '../lib/router.js';
import { hasExistingCampaign, campaign, startNewCampaign, loadCampaignFromFile } from '../lib/campaign.js';

/** Error message for failed file load on welcome screen */
const welcomeLoadError = signal(null);

/** Loading state for the "Start New" / "Get Started" button (D-07) */
const startingNew = signal(false);

/**
 * Handle "Load from file" on welcome screen (D-21).
 * On success, navigates to identity page. On error, shows inline message.
 */
async function handleWelcomeLoad() {
  welcomeLoadError.value = null;
  const result = await loadCampaignFromFile();
  if (result && result.success) {
    navigateTo('identity');
  } else if (result && result.error) {
    welcomeLoadError.value = result.error === 'invalid'
      ? "This file doesn't appear to be a valid ErasureKit campaign"
      : "Could not read this file";
    setTimeout(() => { welcomeLoadError.value = null; }, 5000);
  }
}

/**
 * Landing page with hero heading, step bullets, CTA section, and privacy statement.
 * Returning users (D-19): see Resume Campaign + Start New buttons with summary text (D-20).
 * New users: see Get Started button.
 * Both see "Load from file" link (D-21).
 */
export function WelcomeScreen() {
  const isReturning = hasExistingCampaign.value;

  /** Count non-empty email addresses for the summary text (D-20) */
  const emailCount = isReturning
    ? campaign.value.identity.emails.filter(e => e.trim() !== '').length
    : 0;

  return html`
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <!-- Shield emoji -->
      <div class="text-5xl mb-6 text-center">${'\u{1F6E1}\u{FE0F}'}</div>

      <!-- Hero heading -->
      <h1 class="text-2xl sm:text-3xl font-semibold text-center leading-none mb-4">Take back your data</h1>

      <!-- Body paragraph -->
      <p class="text-base text-[var(--ek-text-muted)] text-center mb-8 leading-normal">
        ErasureKit creates a temporary email address, sends legally-compliant GDPR erasure requests to data brokers on your behalf, and tracks their responses. Your real email is never shared. Free, open source, no accounts required.
      </p>

      <!-- 4 step bullets -->
      <div class="flex flex-col gap-3 mb-8 mx-auto w-fit">
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-[var(--ek-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <span class="text-sm">Enter your identity details</span>
        </div>
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-[var(--ek-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>
          <span class="text-sm">Select brokers holding your data</span>
        </div>
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-[var(--ek-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
          <span class="text-sm">A temp @erasurekit.uk address sends requests for you</span>
        </div>
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-[var(--ek-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span class="text-sm">Track responses and enforce deadlines</span>
        </div>
      </div>

      <!-- CTA section: conditional rendering based on returning user status -->
      ${isReturning ? html`
        <!-- Returning user flow (D-19, D-20, D-21) -->
        <p class="text-sm text-[var(--ek-text-muted)] text-center mb-2">
          You have an unsaved campaign with ${emailCount} email${emailCount !== 1 ? 's' : ''} to erase
        </p>
        ${campaign.value.tempEmail && html`
          <p class="text-sm text-[var(--ek-text-muted)] text-center mb-4">
            Sending from: <span class="font-mono text-[var(--ek-primary)] font-medium">${campaign.value.tempEmail}</span>
          </p>
        `}

        <div class="flex flex-col sm:flex-row justify-center gap-3 mb-4">
          <button
            onClick=${() => navigateTo('identity')}
            class="h-12 px-8 bg-[var(--ek-primary)] text-white text-base font-semibold rounded-lg hover:brightness-90 active:brightness-85 transition-all duration-150 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface)] outline-none"
          >
            Resume Campaign
          </button>
          <button
            onClick=${async () => { startingNew.value = true; await startNewCampaign(); startingNew.value = false; navigateTo('identity'); }}
            disabled=${startingNew.value}
            class="h-12 px-8 bg-transparent border border-[var(--ek-border)] text-[var(--ek-text)] text-base font-semibold rounded-lg hover:bg-[var(--ek-surface-alt)] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface)] outline-none ${startingNew.value ? 'opacity-60 cursor-wait' : ''}"
          >
            ${startingNew.value ? 'Creating campaign...' : 'Start New'}
          </button>
        </div>

        ${/* D-07, D-08: Temp address display for returning users */''}
        ${campaign.value.tempEmail && html`
          <div class="rounded-xl bg-[var(--ek-surface-alt)] border border-[var(--ek-border)] p-4 mt-2 mb-4 text-center">
            <p class="text-xs text-[var(--ek-text-muted)] mb-1">Your requests will be sent from</p>
            <p class="text-base font-mono font-semibold text-[var(--ek-primary)]">${campaign.value.tempEmail}</p>
            <p class="text-xs text-[var(--ek-text-muted)] mt-1">Your real email is never shared with brokers</p>
          </div>
        `}

        <div class="text-center">
          <button
            onClick=${handleWelcomeLoad}
            class="text-sm text-[var(--ek-text-muted)] hover:text-[var(--ek-primary)] underline transition-colors"
          >
            Load from file
          </button>
        </div>

        ${welcomeLoadError.value && html`
          <p class="text-sm text-[var(--ek-danger)] text-center mt-2">${welcomeLoadError.value}</p>
        `}
      ` : html`
        <!-- New user flow -->
        <div class="flex justify-center mb-8">
          <button
            onClick=${async () => { startingNew.value = true; await startNewCampaign(); startingNew.value = false; navigateTo('identity'); }}
            disabled=${startingNew.value}
            class="w-full sm:w-auto h-12 px-8 bg-[var(--ek-primary)] text-white text-base font-semibold rounded-lg hover:brightness-90 active:brightness-85 transition-all duration-150 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface)] outline-none ${startingNew.value ? 'opacity-60 cursor-wait' : ''}"
          >
            ${startingNew.value ? 'Creating campaign...' : 'Get Started'}
          </button>
        </div>
      `}

      <!-- Privacy statement -->
      <p class="text-sm text-[var(--ek-text-muted)] text-center mt-8 flex items-center justify-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        No data leaves your browser. No accounts. No tracking. Open source.
      </p>
    </div>
  `;
}

import { html } from 'htm/preact';
import { navigateTo } from '../lib/router.js';

/**
 * Landing page with hero heading, step bullets, CTA button, and privacy statement.
 * Detects returning users via localStorage 'ek-campaign' key.
 */
export function WelcomeScreen() {
  const hasExistingCampaign = typeof localStorage !== 'undefined' && localStorage.getItem('ek-campaign') !== null;

  return html`
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <!-- Shield emoji -->
      <div class="text-5xl mb-6 text-center">${'\u{1F6E1}\u{FE0F}'}</div>

      <!-- Hero heading -->
      <h1 class="text-2xl sm:text-3xl font-semibold text-center leading-none mb-4">Take back your data</h1>

      <!-- Body paragraph -->
      <p class="text-base text-[var(--ek-text-muted)] text-center mb-8 leading-normal">
        ErasureKit sends legally-compliant GDPR erasure requests to data brokers on your behalf. Free, private, no accounts required.
      </p>

      <!-- 4 step bullets -->
      <div class="flex flex-col gap-3 mb-8">
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
          <span class="text-sm">Send erasure requests in one click</span>
        </div>
        <div class="flex items-center gap-3">
          <svg class="w-4 h-4 text-[var(--ek-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          <span class="text-sm">Track responses and enforce deadlines</span>
        </div>
      </div>

      <!-- CTA button -->
      <div class="flex justify-center mb-8">
        <button
          onClick=${() => navigateTo('identity')}
          class="w-full sm:w-auto h-12 px-8 bg-[var(--ek-primary)] text-white text-base font-semibold rounded-lg hover:brightness-90 active:brightness-85 transition-all duration-150 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ek-surface)] outline-none"
        >
          ${hasExistingCampaign ? 'Resume Campaign' : 'Get Started'}
        </button>
      </div>

      <!-- Privacy statement -->
      <p class="text-sm text-[var(--ek-text-muted)] text-center mt-8 flex items-center justify-center gap-1.5">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        No data leaves your browser. No accounts. No tracking.
      </p>
    </div>
  `;
}

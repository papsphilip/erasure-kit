import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';

// ── Local State ──────────────────────────────────────────────────────────────

/** Countdown seconds remaining for rate limit display */
const countdown = signal(0);

// ── SVG Icons ────────────────────────────────────────────────────────────────

function ClockIcon() {
  return html`
    <svg class="w-10 h-10 text-amber-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `;
}

function CheckCircleIcon() {
  return html`
    <svg class="w-10 h-10 text-emerald-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `;
}

// ── SendProgressModal Component ──────────────────────────────────────────────

/**
 * Full-screen modal shown during batch send (D-01).
 * Three states: sending (progress bar + stats), rate-limited (countdown), complete (summary).
 *
 * @param {{ visible: boolean, progress: object|null, rateLimitInfo: object|null, isComplete: boolean, result: object|null, onAbort: function, onViewCampaign: function }} props
 */
export function SendProgressModal({ visible, progress, rateLimitInfo, isComplete, result, onAbort, onViewCampaign }) {
  if (!visible) return null;

  const intervalRef = useRef(null);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitInfo && rateLimitInfo.seconds > 0) {
      countdown.value = rateLimitInfo.seconds;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        countdown.value = Math.max(0, countdown.value - 1);
        if (countdown.value <= 0 && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 1000);
    } else {
      countdown.value = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rateLimitInfo]);

  const isRateLimited = rateLimitInfo && !isComplete;
  const isSending = !isComplete && !isRateLimited;

  return html`
    <div class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div class="max-w-lg w-full bg-[var(--ek-surface-alt)] rounded-xl border border-[var(--ek-border)] p-8 shadow-2xl">

        ${isSending && progress && html`
          ${/* ── Sending State ── */''}
          <h3 class="text-xl font-semibold text-[var(--ek-text)] text-center mb-6">Sending Requests...</h3>

          ${/* Progress bar */''}
          <div class="w-full h-3 bg-[var(--ek-surface)] rounded-full overflow-hidden">
            <div
              class="h-full bg-[var(--ek-primary)] rounded-full transition-all duration-300"
              style="width: ${Math.round((progress.current / progress.total) * 100)}%"
            ></div>
          </div>

          ${/* Current broker name */''}
          <p class="text-sm text-[var(--ek-text-muted)] truncate mt-3 text-center">
            ${progress.broker?.name || 'Preparing...'}
          </p>

          ${/* Stats row */''}
          <div class="flex justify-between mt-4">
            <span class="text-sm text-emerald-500 font-medium">Sent: ${progress.sent || 0}</span>
            ${(progress.failed || 0) > 0 && html`
              <span class="text-sm text-red-500 font-medium">Failed: ${progress.failed}</span>
            `}
            <span class="text-sm text-[var(--ek-text-muted)]">Remaining: ${progress.total - progress.current}</span>
          </div>

          ${/* Counter */''}
          <p class="text-sm text-center text-[var(--ek-text-muted)] mt-2">
            ${progress.current} of ${progress.total}
          </p>

          ${/* Abort button */''}
          <button
            type="button"
            class="mt-6 w-full h-12 border border-[var(--ek-border)] rounded-lg text-[var(--ek-text)] hover:bg-[var(--ek-surface)] transition-colors duration-150 font-medium"
            onClick=${onAbort}
          >
            Abort Sending
          </button>
        `}

        ${isRateLimited && html`
          ${/* ── Rate Limited State (D-05) ── */''}
          <div class="text-center">
            <${ClockIcon} />
            <h3 class="text-xl font-semibold text-amber-500 mt-4 mb-2">Rate Limited</h3>
            <p class="text-lg text-[var(--ek-text)] font-mono mb-2">
              Resuming in ${countdown.value}s...
            </p>
            <p class="text-sm text-[var(--ek-text-muted)]">
              Paused on: ${rateLimitInfo.broker?.name || 'Unknown'}
            </p>
          </div>

          ${/* Abort button */''}
          <button
            type="button"
            class="mt-6 w-full h-12 border border-[var(--ek-border)] rounded-lg text-[var(--ek-text)] hover:bg-[var(--ek-surface)] transition-colors duration-150 font-medium"
            onClick=${onAbort}
          >
            Abort Sending
          </button>
        `}

        ${isComplete && result && html`
          ${/* ── Complete State (D-03) ── */''}
          <div class="text-center">
            <${CheckCircleIcon} />
            <h3 class="text-xl font-semibold text-[var(--ek-text)] mt-4 mb-2">Sending Complete</h3>
            <p class="text-sm text-[var(--ek-text-muted)]">
              ${result.sent} sent${result.failed > 0 ? `, ${result.failed} failed` : ''}
            </p>
          </div>

          ${/* View Campaign button */''}
          <button
            type="button"
            class="mt-6 w-full h-12 bg-[var(--ek-primary)] text-white rounded-lg font-medium hover:brightness-90 transition-all duration-150"
            onClick=${onViewCampaign}
          >
            View Campaign
          </button>
        `}

      </div>
    </div>
  `;
}

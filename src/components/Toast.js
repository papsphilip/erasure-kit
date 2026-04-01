import { html } from 'htm/preact';
import { activeToasts, dismissToast } from '../lib/notifications.js';
import { navigateTo } from '../lib/router.js';

// ── Color Mapping (D-52) ────────────────────────────────────────────────────────

const TOAST_COLORS = {
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
  info: 'bg-sky-600',
};

// ── Toast Container ─────────────────────────────────────────────────────────────

/**
 * Fixed bottom-right toast container.
 * Per D-51: auto-dismiss after 5 seconds (handled in notifications.js).
 * Per D-52: color-coded by type.
 * Per D-53: clickable — navigates to Track page if brokerId exists.
 * Max 5 visible toasts.
 */
export function ToastContainer() {
  const toasts = activeToasts.value.slice(0, 5);

  if (toasts.length === 0) return null;

  return html`
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <style>
        @keyframes ek-slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .ek-toast-enter {
          animation: ek-slide-in-right 200ms ease-out forwards;
        }
      </style>
      ${toasts.map(toast => html`
        <div
          key=${toast.id}
          class="ek-toast-enter pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[380px] px-4 py-3 rounded-lg shadow-lg text-white text-sm ${TOAST_COLORS[toast.type] || TOAST_COLORS.info} ${toast.brokerId ? 'cursor-pointer' : ''}"
          onClick=${() => {
            if (toast.brokerId) {
              navigateTo('track');
            }
            dismissToast(toast.id);
          }}
          role="alert"
        >
          <span class="flex-1">${toast.message}</span>
          <button
            class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-white/70 hover:text-white transition-colors"
            onClick=${(e) => {
              e.stopPropagation();
              dismissToast(toast.id);
            }}
            aria-label="Dismiss notification"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      `)}
    </div>
  `;
}

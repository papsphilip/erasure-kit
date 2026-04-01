import { html } from 'htm/preact';
import { signal } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import {
  notifications,
  unreadCount,
  markRead,
  markAllRead,
} from '../lib/notifications.js';
import { navigateTo } from '../lib/router.js';

// ── Local State ─────────────────────────────────────────────────────────────────

/** Whether the bell dropdown is open */
const bellOpen = signal(false);

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Format a relative time string from an ISO timestamp.
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} e.g. "2m ago", "1h ago", "3d ago"
 */
function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Color dot class by notification type (D-52) */
const DOT_COLORS = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
};

// ── NotificationBell Component (D-55, D-56, D-57) ───────────────────────────────

/**
 * Bell icon button with dropdown for the header.
 * Per D-55: Red dot badge with unread count.
 * Per D-56: Clicking a notification navigates to Track page.
 * Per D-57: Track page is full history, bell is quick access.
 */
export function NotificationBell() {
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!bellOpen.value) return;

    function handleClickOutside(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        bellOpen.value = false;
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [bellOpen.value]);

  // Get 5 most recent notifications for dropdown
  const recent = notifications.value.slice(0, 5);
  const hasUnread = unreadCount.value > 0;

  function handleNotificationClick(notification) {
    markRead(notification.id);
    if (notification.brokerId) {
      navigateTo('track');
    }
    bellOpen.value = false;
  }

  function handleMarkAllRead(e) {
    e.preventDefault();
    e.stopPropagation();
    markAllRead();
  }

  return html`
    <div class="relative">
      ${/* Bell button */''}
      <button
        ref=${buttonRef}
        class="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)]/50 transition-colors relative"
        onClick=${() => { bellOpen.value = !bellOpen.value; }}
        aria-label="Notifications"
        title="Notifications"
      >
        ${/* Bell SVG icon */''}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>

        ${/* Unread badge (D-55) */''}
        ${hasUnread && html`
          <span class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white font-bold flex items-center justify-center leading-none">
            ${unreadCount.value > 9 ? '9+' : unreadCount.value}
          </span>
        `}
      </button>

      ${/* Dropdown */''}
      ${bellOpen.value && html`
        <div
          ref=${dropdownRef}
          class="absolute top-full right-0 mt-2 w-80 bg-[var(--ek-surface-alt)] border border-[var(--ek-border)] rounded-xl shadow-xl z-50 overflow-hidden"
        >
          ${/* Header */''}
          <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--ek-border)]">
            <span class="text-sm font-semibold text-[var(--ek-text)]">Notifications</span>
            ${hasUnread && html`
              <button
                class="text-xs text-[var(--ek-primary)] hover:underline bg-transparent border-none cursor-pointer"
                onClick=${handleMarkAllRead}
              >Mark all read</button>
            `}
          </div>

          ${/* Notification list */''}
          <div class="max-h-80 overflow-y-auto">
            ${recent.length === 0
              ? html`<div class="px-4 py-6 text-center text-sm text-[var(--ek-text-muted)]">No notifications yet</div>`
              : recent.map(n => html`
                <button
                  key=${n.id}
                  class="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--ek-surface)]/50 transition-colors border-none cursor-pointer ${!n.read ? 'bg-[var(--ek-primary)]/5' : 'bg-transparent'}"
                  onClick=${() => handleNotificationClick(n)}
                >
                  ${/* Color dot */''}
                  <span class="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${DOT_COLORS[n.type] || DOT_COLORS.info}"></span>

                  ${/* Content */''}
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-[var(--ek-text)] leading-snug ${!n.read ? 'font-medium' : ''}">${n.message}</p>
                    <p class="text-xs text-[var(--ek-text-muted)] mt-0.5">${relativeTime(n.at)}</p>
                  </div>

                  ${/* Unread indicator */''}
                  ${!n.read && html`
                    <span class="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[var(--ek-primary)]"></span>
                  `}
                </button>
              `)
            }
          </div>
        </div>
      `}
    </div>
  `;
}

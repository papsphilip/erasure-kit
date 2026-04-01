import { signal, computed } from '@preact/signals';

// ── Notification State ──────────────────────────────────────────────────────────

/** All notifications (most recent first), max 50 */
export const notifications = signal([]);

/** Computed: count of unread notifications */
export const unreadCount = computed(() =>
  notifications.value.filter(n => !n.read).length
);

/** Computed: active toasts (showToast === true, not yet dismissed) */
export const activeToasts = computed(() =>
  notifications.value.filter(n => n.showToast)
);

// ── Operations ──────────────────────────────────────────────────────────────────

/**
 * Add a notification.
 * Per D-51: toast auto-dismiss after 5 seconds.
 * Per D-52: type determines color (success/warning/danger/info).
 * Per D-53: brokerId allows click-to-navigate.
 * @param {{ type?: 'success'|'warning'|'danger'|'info', message: string, brokerId?: string, showToast?: boolean }} notification
 * @returns {string} notification ID
 */
export function addNotification(notification) {
  const id = crypto.randomUUID();
  const entry = {
    id,
    type: notification.type || 'info',
    message: notification.message,
    brokerId: notification.brokerId || null,
    read: false,
    showToast: notification.showToast !== false, // default true
    at: new Date().toISOString(),
  };

  notifications.value = [entry, ...notifications.value].slice(0, 50);

  // Auto-dismiss toast after 5 seconds (per D-51)
  if (entry.showToast) {
    setTimeout(() => dismissToast(id), 5000);
  }

  return id;
}

/** Dismiss a toast (hide from screen, keep in bell history) */
export function dismissToast(id) {
  notifications.value = notifications.value.map(n =>
    n.id === id ? { ...n, showToast: false } : n
  );
}

/** Mark a single notification as read (per D-56: click in bell dropdown) */
export function markRead(id) {
  notifications.value = notifications.value.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
}

/** Mark all notifications as read (per D-54: clears badge when visiting Track) */
export function markAllRead() {
  notifications.value = notifications.value.map(n => ({ ...n, read: true }));
}

/** Clear all notifications */
export function clearAll() {
  notifications.value = [];
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────────

let counter = 0;
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => `test-id-${counter++}`),
});

// ── Module Under Test ──────────────────────────────────────────────────────────

import {
  notifications,
  unreadCount,
  activeToasts,
  addNotification,
  dismissToast,
  markRead,
  markAllRead,
  clearAll,
} from './notifications.js';

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  counter = 0;
  clearAll();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('notifications', () => {
  describe('addNotification', () => {
    it('adds an entry with id, type, message, read:false, and ISO timestamp', () => {
      const id = addNotification({ type: 'success', message: 'Sent' });

      expect(id).toBe('test-id-0');
      expect(notifications.value).toHaveLength(1);

      const entry = notifications.value[0];
      expect(entry.id).toBe('test-id-0');
      expect(entry.type).toBe('success');
      expect(entry.message).toBe('Sent');
      expect(entry.read).toBe(false);
      expect(entry.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('defaults showToast to true when not specified', () => {
      addNotification({ type: 'info', message: 'Test' });
      expect(notifications.value[0].showToast).toBe(true);
    });

    it('stores max 50 notifications, dropping oldest', () => {
      for (let i = 0; i < 55; i++) {
        addNotification({ type: 'info', message: `msg-${i}` });
      }

      expect(notifications.value).toHaveLength(50);
      // Most recent should be first
      expect(notifications.value[0].message).toBe('msg-54');
      // Oldest kept should be msg-5 (first 5 were dropped)
      expect(notifications.value[49].message).toBe('msg-5');
    });

    it('stores brokerId when provided', () => {
      addNotification({ type: 'success', message: 'Done', brokerId: 'acxiom' });
      expect(notifications.value[0].brokerId).toBe('acxiom');
    });

    it('defaults brokerId to null when not provided', () => {
      addNotification({ type: 'info', message: 'Test' });
      expect(notifications.value[0].brokerId).toBeNull();
    });

    it('defaults type to info when not provided', () => {
      addNotification({ message: 'No type' });
      expect(notifications.value[0].type).toBe('info');
    });

    it('respects showToast:false when explicitly set', () => {
      addNotification({ type: 'info', message: 'Silent', showToast: false });
      expect(notifications.value[0].showToast).toBe(false);
    });
  });

  describe('auto-dismiss toast after 5 seconds (D-51)', () => {
    it('auto-dismisses toast after 5000ms', () => {
      addNotification({ type: 'success', message: 'Test' });
      expect(notifications.value[0].showToast).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(notifications.value[0].showToast).toBe(false);
    });

    it('does not schedule auto-dismiss when showToast is false', () => {
      addNotification({ type: 'info', message: 'Silent', showToast: false });
      vi.advanceTimersByTime(5000);
      // showToast should still be false (no timer was set)
      expect(notifications.value[0].showToast).toBe(false);
    });
  });

  describe('unreadCount', () => {
    it('returns count of notifications where read === false', () => {
      addNotification({ type: 'info', message: 'A' });
      addNotification({ type: 'info', message: 'B' });
      addNotification({ type: 'info', message: 'C' });

      expect(unreadCount.value).toBe(3);
    });

    it('returns 0 when no notifications', () => {
      expect(unreadCount.value).toBe(0);
    });

    it('decreases when notifications are marked read', () => {
      const id = addNotification({ type: 'info', message: 'A' });
      addNotification({ type: 'info', message: 'B' });

      markRead(id);
      expect(unreadCount.value).toBe(1);
    });
  });

  describe('activeToasts', () => {
    it('returns only notifications with showToast:true', () => {
      addNotification({ type: 'info', message: 'Visible' });
      addNotification({ type: 'info', message: 'Hidden', showToast: false });

      expect(activeToasts.value).toHaveLength(1);
      expect(activeToasts.value[0].message).toBe('Visible');
    });

    it('updates when toast is dismissed', () => {
      const id = addNotification({ type: 'info', message: 'Test' });
      expect(activeToasts.value).toHaveLength(1);

      dismissToast(id);
      expect(activeToasts.value).toHaveLength(0);
    });
  });

  describe('dismissToast', () => {
    it('sets showToast:false on matching notification', () => {
      const id = addNotification({ type: 'info', message: 'Test' });
      dismissToast(id);

      expect(notifications.value[0].showToast).toBe(false);
    });

    it('keeps the notification in the list (only hides toast)', () => {
      const id = addNotification({ type: 'info', message: 'Test' });
      dismissToast(id);

      expect(notifications.value).toHaveLength(1);
      expect(notifications.value[0].message).toBe('Test');
    });
  });

  describe('markRead', () => {
    it('sets read:true on matching notification', () => {
      const id = addNotification({ type: 'info', message: 'Test' });
      expect(notifications.value[0].read).toBe(false);

      markRead(id);
      expect(notifications.value[0].read).toBe(true);
    });

    it('does not affect other notifications', () => {
      const id1 = addNotification({ type: 'info', message: 'A' });
      addNotification({ type: 'info', message: 'B' });

      markRead(id1);
      // B (index 0, most recent) should still be unread
      expect(notifications.value[0].read).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('sets all notifications to read:true', () => {
      addNotification({ type: 'info', message: 'A' });
      addNotification({ type: 'info', message: 'B' });
      addNotification({ type: 'info', message: 'C' });

      markAllRead();

      expect(notifications.value.every(n => n.read)).toBe(true);
      expect(unreadCount.value).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('empties the notifications array', () => {
      addNotification({ type: 'info', message: 'A' });
      addNotification({ type: 'info', message: 'B' });

      clearAll();

      expect(notifications.value).toHaveLength(0);
      expect(unreadCount.value).toBe(0);
      expect(activeToasts.value).toHaveLength(0);
    });
  });
});

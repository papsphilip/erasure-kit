import { campaign } from './campaign.js';
import { addMonths, isAfter, startOfDay, differenceInCalendarDays, format } from 'date-fns';

// ── Status Enum ──────────────────────────────────────────────────────────────

/**
 * Valid broker status values in the lifecycle.
 * Flow: not_selected -> selected -> awaiting -> confirmed/rejected/escalated/overdue
 * Note: D-37 skips "sent" — goes directly to "awaiting" after send.
 */
export const STATUS = {
  NOT_SELECTED: 'not_selected',
  SELECTED: 'selected',
  AWAITING: 'awaiting',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  OVERDUE: 'overdue',
  FAILED: 'failed',
};

/**
 * Human-readable labels for each status.
 */
export const STATUS_LABELS = {
  [STATUS.NOT_SELECTED]: 'Not Selected',
  [STATUS.SELECTED]: 'Selected',
  [STATUS.AWAITING]: 'Awaiting Response',
  [STATUS.CONFIRMED]: 'Confirmed',
  [STATUS.REJECTED]: 'Rejected',
  [STATUS.ESCALATED]: 'Escalated',
  [STATUS.OVERDUE]: 'Overdue',
  [STATUS.FAILED]: 'Failed',
};

/**
 * Color tokens for each status (Tailwind utility-compatible).
 */
export const STATUS_COLORS = {
  [STATUS.AWAITING]: { bg: 'bg-amber-500/15', text: 'text-amber-500', dot: 'bg-amber-500' },
  [STATUS.CONFIRMED]: { bg: 'bg-emerald-500/15', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  [STATUS.REJECTED]: { bg: 'bg-red-500/15', text: 'text-red-500', dot: 'bg-red-500' },
  [STATUS.ESCALATED]: { bg: 'bg-orange-500/15', text: 'text-orange-500', dot: 'bg-orange-500' },
  [STATUS.OVERDUE]: { bg: 'bg-red-700/15', text: 'text-red-600', dot: 'bg-red-700' },
  [STATUS.SELECTED]: { bg: 'bg-sky-500/15', text: 'text-sky-500', dot: 'bg-sky-500' },
  [STATUS.FAILED]: { bg: 'bg-red-500/15', text: 'text-red-500', dot: 'bg-red-500' },
};

// ── Status Helpers ───────────────────────────────────────────────────────────

/**
 * Get the status object for a specific broker.
 * @param {string} brokerId - The broker ID slug
 * @returns {object|null} Status object { status, sentAt, deadline, history } or null
 */
export function getBrokerStatus(brokerId) {
  const statuses = campaign.value.statuses || {};
  return statuses[brokerId] || null;
}

/**
 * Get the current status string for a broker.
 * @param {string} brokerId - The broker ID slug
 * @returns {string} Status string (defaults to 'not_selected')
 */
export function getBrokerStatusValue(brokerId) {
  const entry = getBrokerStatus(brokerId);
  return entry ? entry.status : STATUS.NOT_SELECTED;
}

/**
 * Update a broker's status with full history tracking (D-41).
 * Immutable campaign update pattern.
 * @param {string} brokerId - The broker ID slug
 * @param {string} status - New status value
 * @param {string} [details] - Optional detail text for history entry
 */
export function updateBrokerStatus(brokerId, status, details) {
  const existing = getBrokerStatus(brokerId) || {
    status: STATUS.NOT_SELECTED,
    sentAt: null,
    deadline: null,
    history: [],
  };

  const historyEntry = {
    status,
    at: new Date().toISOString(),
    details: details || null,
  };

  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    statuses: {
      ...campaign.value.statuses,
      [brokerId]: {
        ...existing,
        status,
        history: [...existing.history, historyEntry],
      },
    },
  };
}

/**
 * Mark a broker as sent (D-37): status goes directly to 'awaiting'.
 * Records sentAt timestamp and calculates calendar-month deadline (D-38).
 * Uses date-fns addMonths for legally accurate "one calendar month" deadline.
 * @param {string} brokerId - The broker ID slug
 */
export function markBrokerSent(brokerId) {
  const now = new Date();
  const sentAt = now.toISOString();
  // D-38: Calendar month deadline via addMonths (Jan 31 + 1 month = Feb 28)
  const deadline = addMonths(now, 1).toISOString();

  const existing = getBrokerStatus(brokerId) || {
    status: STATUS.SELECTED,
    sentAt: null,
    deadline: null,
    history: [],
  };

  const historyEntry = {
    status: STATUS.AWAITING,
    at: sentAt,
    details: 'Erasure request sent',
  };

  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    statuses: {
      ...campaign.value.statuses,
      [brokerId]: {
        ...existing,
        status: STATUS.AWAITING,
        sentAt,
        deadline,
        history: [...existing.history, historyEntry],
      },
    },
  };
}

/**
 * Mark a broker as failed (D-04): records error code and message.
 * Preserves existing sentAt and deadline values.
 * @param {string} brokerId - The broker ID slug
 * @param {string} errorCode - Error code from relay (e.g. 'RESEND_FAILED', 'RATE_LIMITED')
 * @param {string} errorMessage - Human-readable error message
 */
export function markBrokerFailed(brokerId, errorCode, errorMessage) {
  const existing = getBrokerStatus(brokerId) || {
    status: STATUS.SELECTED,
    sentAt: null,
    deadline: null,
    history: [],
  };

  const historyEntry = {
    status: STATUS.FAILED,
    at: new Date().toISOString(),
    details: `${errorCode}: ${errorMessage}`,
  };

  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    statuses: {
      ...campaign.value.statuses,
      [brokerId]: {
        ...existing,
        status: STATUS.FAILED,
        error: { code: errorCode, message: errorMessage },
        history: [...existing.history, historyEntry],
      },
    },
  };
}

/**
 * Retry a failed broker — reset status back to SELECTED for re-send.
 * Clears the error field but preserves sentAt and deadline.
 * @param {string} brokerId - The broker ID slug
 */
export function retryBroker(brokerId) {
  const existing = getBrokerStatus(brokerId) || {
    status: STATUS.FAILED,
    sentAt: null,
    deadline: null,
    history: [],
  };

  const historyEntry = {
    status: STATUS.SELECTED,
    at: new Date().toISOString(),
    details: 'Queued for retry',
  };

  // Destructure to remove error field from the spread
  const { error, ...rest } = existing;

  campaign.value = {
    ...campaign.value,
    updatedAt: new Date().toISOString(),
    statuses: {
      ...campaign.value.statuses,
      [brokerId]: {
        ...rest,
        status: STATUS.SELECTED,
        history: [...existing.history, historyEntry],
      },
    },
  };
}

/**
 * Check all brokers for overdue status (D-39, D-40).
 * Overdue = day after deadline. If deadline is Apr 28 and it's Apr 29, broker is overdue.
 * Auto-updates status to 'overdue' for brokers past their deadline.
 * @returns {string[]} Array of broker IDs that were marked overdue
 */
export function checkOverdueBrokers() {
  const statuses = campaign.value.statuses || {};
  const today = startOfDay(new Date());
  const overdueIds = [];

  for (const [brokerId, entry] of Object.entries(statuses)) {
    if (entry.status === STATUS.AWAITING && entry.deadline) {
      const deadlineDate = startOfDay(new Date(entry.deadline));
      // D-39: Overdue = day after deadline
      if (isAfter(today, deadlineDate)) {
        overdueIds.push(brokerId);
      }
    }
  }

  // Batch update all overdue brokers
  if (overdueIds.length > 0) {
    const updatedStatuses = { ...statuses };
    for (const id of overdueIds) {
      const existing = updatedStatuses[id];
      updatedStatuses[id] = {
        ...existing,
        status: STATUS.OVERDUE,
        history: [
          ...existing.history,
          {
            status: STATUS.OVERDUE,
            at: new Date().toISOString(),
            details: 'Deadline exceeded — broker is overdue',
          },
        ],
      };
    }
    campaign.value = {
      ...campaign.value,
      updatedAt: new Date().toISOString(),
      statuses: updatedStatuses,
    };
  }

  return overdueIds;
}

/**
 * Get the full history for a broker (D-30).
 * @param {string} brokerId - The broker ID slug
 * @returns {Array} History entries array
 */
export function getBrokerHistory(brokerId) {
  const entry = getBrokerStatus(brokerId);
  return entry ? entry.history : [];
}

// ── Aggregate Stats (D-25, D-26, D-33) ─────────────────────────────────────

/**
 * Get aggregate status counts for the campaign dashboard.
 * Only counts brokers that are selected (have a status entry).
 * @returns {{ total: number, awaiting: number, confirmed: number, rejected: number, escalated: number, overdue: number, sent: number }}
 */
export function getStatusCounts() {
  const statuses = campaign.value.statuses || {};
  const selected = campaign.value.brokers.selected || [];
  const counts = {
    total: selected.length,
    awaiting: 0,
    confirmed: 0,
    rejected: 0,
    escalated: 0,
    overdue: 0,
    failed: 0,
    sent: 0, // sent = awaiting + confirmed + rejected + escalated + overdue (NOT failed)
  };

  for (const brokerId of selected) {
    const entry = statuses[brokerId];
    if (!entry) continue;

    switch (entry.status) {
      case STATUS.AWAITING:
        counts.awaiting++;
        counts.sent++;
        break;
      case STATUS.CONFIRMED:
        counts.confirmed++;
        counts.sent++;
        break;
      case STATUS.REJECTED:
        counts.rejected++;
        counts.sent++;
        break;
      case STATUS.ESCALATED:
        counts.escalated++;
        counts.sent++;
        break;
      case STATUS.OVERDUE:
        counts.overdue++;
        counts.sent++;
        break;
      case STATUS.FAILED:
        counts.failed++;
        break;
    }
  }

  return counts;
}

/**
 * Get campaign progress percentage (D-25).
 * Progress = (confirmed + rejected) / total selected.
 * 100% means every broker resolved (confirmed or rejected).
 * @returns {number} Progress percentage (0-100)
 */
export function getProgressPercent() {
  const counts = getStatusCounts();
  if (counts.total === 0) return 0;
  return Math.round(((counts.confirmed + counts.rejected) / counts.total) * 100);
}

// ── Deadline Formatting Helpers (D-28) ──────────────────────────────────────

/**
 * Format a deadline date for display with countdown.
 * Returns "Apr 28 (23 days left)" or "Apr 28 (3 days overdue)" format.
 * @param {string} deadlineISO - ISO date string of the deadline
 * @returns {{ text: string, daysLeft: number, color: string }}
 */
export function formatDeadline(deadlineISO) {
  if (!deadlineISO) return { text: 'No deadline', daysLeft: 0, color: 'text-[var(--ek-text-muted)]' };

  const deadline = new Date(deadlineISO);
  const today = startOfDay(new Date());
  const deadlineDay = startOfDay(deadline);
  const daysLeft = differenceInCalendarDays(deadlineDay, today);
  const dateStr = format(deadline, 'MMM d');

  let text, color;
  if (daysLeft < 0) {
    text = `${dateStr} (${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} overdue)`;
    color = 'text-red-600';
  } else if (daysLeft === 0) {
    text = `${dateStr} (today)`;
    color = 'text-red-500';
  } else if (daysLeft <= 7) {
    text = `${dateStr} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`;
    color = 'text-red-500';
  } else if (daysLeft <= 14) {
    text = `${dateStr} (${daysLeft} days left)`;
    color = 'text-amber-500';
  } else {
    text = `${dateStr} (${daysLeft} days left)`;
    color = 'text-emerald-500';
  }

  return { text, daysLeft, color };
}

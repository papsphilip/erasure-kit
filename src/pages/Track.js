import { html } from 'htm/preact';
import { signal, computed } from '@preact/signals';
import { campaign } from '../lib/campaign.js';
import { navigateTo } from '../lib/router.js';
import {
  STATUS,
  STATUS_LABELS,
  STATUS_COLORS,
  getStatusCounts,
  getProgressPercent,
  checkOverdueBrokers,
  getBrokerStatus,
  getBrokerHistory,
  formatDeadline,
} from '../lib/status-tracker.js';
import { allBrokers } from '../pages/Brokers.js';

// ── Local UI State ──────────────────────────────────────────────────────────

/** Status filter for the broker list ("" = all) */
const statusFilter = signal('');

/** Sort option: "deadline" | "name" | "status" */
const sortBy = signal('deadline');

/** ID of the currently expanded history row */
const expandedHistory = signal(null);

/** Whether overdue check has run this session */
let _overdueChecked = false;

// ── Derived Data ─────────────────────────────────────────────────────────────

/** Selected broker objects with their status data */
const trackedBrokers = computed(() => {
  const selected = campaign.value.brokers.selected || [];
  const statuses = campaign.value.statuses || {};
  const brokerMap = new Map((allBrokers.value || []).map((b) => [b.id, b]));

  return selected
    .map((id) => {
      const broker = brokerMap.get(id);
      if (!broker) return null;
      const statusEntry = statuses[id] || null;
      return {
        ...broker,
        statusEntry,
        currentStatus: statusEntry ? statusEntry.status : STATUS.SELECTED,
      };
    })
    .filter(Boolean);
});

/** Filtered and sorted tracked brokers */
const filteredTracked = computed(() => {
  let list = trackedBrokers.value;

  // Filter by status
  if (statusFilter.value) {
    list = list.filter((b) => b.currentStatus === statusFilter.value);
  }

  // Sort
  const sort = sortBy.value;
  list = [...list].sort((a, b) => {
    if (sort === 'deadline') {
      const aDeadline = a.statusEntry?.deadline || '';
      const bDeadline = b.statusEntry?.deadline || '';
      if (!aDeadline && !bDeadline) return 0;
      if (!aDeadline) return 1;
      if (!bDeadline) return -1;
      return aDeadline.localeCompare(bDeadline);
    }
    if (sort === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sort === 'status') {
      const statusOrder = {
        [STATUS.OVERDUE]: 0,
        [STATUS.AWAITING]: 1,
        [STATUS.ESCALATED]: 2,
        [STATUS.REJECTED]: 3,
        [STATUS.CONFIRMED]: 4,
        [STATUS.SELECTED]: 5,
      };
      return (statusOrder[a.currentStatus] ?? 99) - (statusOrder[b.currentStatus] ?? 99);
    }
    return 0;
  });

  return list;
});

/** Available statuses for filter dropdown */
const availableStatuses = computed(() => {
  const statuses = new Set(trackedBrokers.value.map((b) => b.currentStatus));
  return [...statuses].sort();
});

// ── SVG Icons ───────────────────────────────────────────────────────────────

function ChevronDownIcon({ open }) {
  return html`
    <svg
      class="w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}"
      fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
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

function CheckCircleIcon() {
  return html`
    <svg class="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  `;
}

function InboxIcon() {
  return html`
    <svg class="w-12 h-12 text-[var(--ek-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.399 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121.75 6v7.5" />
    </svg>
  `;
}

// ── Track Page Component ────────────────────────────────────────────────────

/**
 * Campaign dashboard page (D-24 through D-36).
 * Shows progress bar, stat cards, and broker status list.
 */
export function Track() {
  // D-40: Auto-detect overdue brokers on page load
  if (!_overdueChecked) {
    _overdueChecked = true;
    checkOverdueBrokers();
  }

  const counts = getStatusCounts();
  const progress = getProgressPercent();
  const tracked = filteredTracked.value;
  const allTracked = trackedBrokers.value;
  const allResolved = counts.total > 0 && progress === 100;

  // D-32: Empty state
  if (counts.total === 0) {
    return html`
      <div class="max-w-4xl mx-auto px-4 py-16 text-center">
        <${InboxIcon} />
        <h2 class="text-xl font-semibold text-[var(--ek-text)] mt-4 mb-2">No requests sent yet</h2>
        <p class="text-[var(--ek-text-muted)] mb-6">Select brokers and send erasure requests to start tracking.</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--ek-primary)] text-white font-medium hover:brightness-90 transition-all duration-150"
          onClick=${() => navigateTo('brokers')}
        >
          Go to Brokers
          <${ArrowRightIcon} />
        </button>
      </div>
    `;
  }

  return html`
    <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">

      ${/* ── Success Banner (D-34) ── */''}
      ${allResolved && html`
        <div class="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center">
          <${CheckCircleIcon} />
          <h2 class="text-lg font-semibold text-emerald-500 mt-3 mb-1">All brokers resolved!</h2>
          <p class="text-sm text-[var(--ek-text-muted)]">Your data erasure campaign is complete. Save your progress for your records.</p>
        </div>
      `}

      ${/* ── Progress Bar (D-25) ── */''}
      <div class="rounded-xl bg-[var(--ek-surface-alt)] border border-[var(--ek-border)] p-6">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-semibold text-[var(--ek-text)]">Campaign Progress</h2>
          <span class="text-lg font-bold text-[var(--ek-primary)]">${progress}%</span>
        </div>
        <div class="w-full h-3 bg-[var(--ek-surface)] rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 ${
              allResolved ? 'bg-emerald-500' : 'bg-[var(--ek-primary)]'
            }"
            style="width: ${progress}%"
          ></div>
        </div>
        <p class="text-xs text-[var(--ek-text-muted)] mt-2">
          ${counts.confirmed + counts.rejected} of ${counts.total} brokers resolved
          (${counts.confirmed} confirmed, ${counts.rejected} rejected)
        </p>
      </div>

      ${/* ── Stat Cards Grid (D-26) ── */''}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <${StatCard} label="Sent" count=${counts.sent} color="sky" />
        <${StatCard} label="Awaiting" count=${counts.awaiting} color="amber" />
        <${StatCard} label="Confirmed" count=${counts.confirmed} color="emerald" />
        <${StatCard} label="Rejected" count=${counts.rejected} color="red" />
        <${StatCard} label="Overdue" count=${counts.overdue} color="rose" />
      </div>

      ${/* ── Filter/Sort Controls (D-27) ── */''}
      <div class="flex flex-wrap items-center gap-3">
        <select
          class="h-10 px-3 rounded-lg bg-[var(--ek-surface)] border border-[var(--ek-border)] text-[var(--ek-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ek-primary)] cursor-pointer"
          value=${statusFilter.value}
          onChange=${(e) => { statusFilter.value = e.target.value; }}
        >
          <option value="">All Statuses</option>
          ${availableStatuses.value.map((s) => html`
            <option value=${s}>${STATUS_LABELS[s] || s}</option>
          `)}
        </select>
        <select
          class="h-10 px-3 rounded-lg bg-[var(--ek-surface)] border border-[var(--ek-border)] text-[var(--ek-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ek-primary)] cursor-pointer"
          value=${sortBy.value}
          onChange=${(e) => { sortBy.value = e.target.value; }}
        >
          <option value="deadline">Sort by Deadline</option>
          <option value="name">Sort by Name</option>
          <option value="status">Sort by Status</option>
        </select>
        <span class="text-xs text-[var(--ek-text-muted)]">
          Showing ${tracked.length} of ${allTracked.length} brokers
        </span>
      </div>

      ${/* ── Broker Status List (D-27, D-28) ── */''}
      <div class="rounded-xl bg-[var(--ek-surface-alt)] border border-[var(--ek-border)] overflow-hidden">
        ${tracked.length === 0
          ? html`
            <div class="px-4 py-12 text-center">
              <p class="text-[var(--ek-text-muted)]">No brokers match this filter</p>
            </div>
          `
          : html`
            <div class="divide-y divide-[var(--ek-border)]">
              ${tracked.map((broker) => html`
                <${BrokerStatusRow} key=${broker.id} broker=${broker} />
              `)}
            </div>
          `
        }
      </div>
    </div>
  `;
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, count, color }) {
  const colorMap = {
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-500', border: 'border-sky-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
    rose: { bg: 'bg-red-700/10', text: 'text-red-600', border: 'border-red-700/20' },
  };
  const c = colorMap[color] || colorMap.sky;

  return html`
    <div class="rounded-lg ${c.bg} border ${c.border} p-4 text-center">
      <div class="text-2xl font-bold ${c.text}">${count}</div>
      <div class="text-xs text-[var(--ek-text-muted)] mt-1">${label}</div>
    </div>
  `;
}

// ── Broker Status Row ────────────────────────────────────────────────────────

function BrokerStatusRow({ broker }) {
  const { statusEntry, currentStatus } = broker;
  const isExpanded = expandedHistory.value === broker.id;
  const isOverdue = currentStatus === STATUS.OVERDUE;
  const deadline = statusEntry?.deadline;
  const deadlineInfo = deadline ? formatDeadline(deadline) : null;
  const history = getBrokerHistory(broker.id);

  // Status badge
  const colors = STATUS_COLORS[currentStatus] || { bg: 'bg-[var(--ek-surface)]', text: 'text-[var(--ek-text-muted)]' };

  return html`
    <div class="${isOverdue ? 'bg-red-500/5' : ''}">
      <div
        class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--ek-surface)]/30 transition-colors duration-100"
        onClick=${() => { expandedHistory.value = isExpanded ? null : broker.id; }}
      >
        ${/* Status dot */''}
        <div class="flex-shrink-0">
          <div class="w-2.5 h-2.5 rounded-full ${colors.dot || 'bg-[var(--ek-text-muted)]'}"></div>
        </div>

        ${/* Broker name + status badge */''}
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm text-[var(--ek-text)] truncate">${broker.name}</span>
            <span class="text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium flex-shrink-0">
              ${STATUS_LABELS[currentStatus] || currentStatus}
            </span>
          </div>
          ${/* D-28: Deadline display */''}
          ${deadlineInfo && html`
            <div class="text-xs ${deadlineInfo.color} mt-0.5">
              ${deadlineInfo.text}
            </div>
          `}
        </div>

        ${/* D-29: Escalate button for overdue */''}
        ${isOverdue && html`
          <button
            type="button"
            class="flex-shrink-0 text-xs px-2.5 py-1 rounded bg-red-500/15 text-red-500 font-medium hover:bg-red-500/25 transition-colors duration-150"
            onClick=${(e) => { e.stopPropagation(); /* Escalation is Phase 8 */ }}
            title="Escalation coming in Phase 8"
          >Escalate</button>
        `}

        ${/* Expand chevron */''}
        <div class="flex-shrink-0 text-[var(--ek-text-muted)]">
          <${ChevronDownIcon} open=${isExpanded} />
        </div>
      </div>

      ${/* D-30: Expandable history */''}
      ${isExpanded && history.length > 0 && html`
        <div class="px-4 pb-3 pl-10">
          <div class="border-l-2 border-[var(--ek-border)] pl-4 space-y-2">
            ${history.map((entry, i) => html`
              <div key=${i} class="text-xs">
                <span class="text-[var(--ek-text-muted)]">
                  ${new Date(entry.at).toLocaleDateString()} ${new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span class="ml-2 text-[var(--ek-text)]">${STATUS_LABELS[entry.status] || entry.status}</span>
                ${entry.details && html`
                  <span class="ml-1 text-[var(--ek-text-muted)]"> -- ${entry.details}</span>
                `}
              </div>
            `)}
          </div>
        </div>
      `}
    </div>
  `;
}

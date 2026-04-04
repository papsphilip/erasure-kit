import { html } from 'htm/preact';
import { signal, computed } from '@preact/signals';
import { campaign, endCampaign } from '../lib/campaign.js';
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
  retryBroker,
} from '../lib/status-tracker.js';
import { addNotification } from '../lib/notifications.js';
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

/** Whether End Campaign confirmation dialog is showing (D-11) */
const showEndCampaignDialog = signal(false);

/** Whether End Campaign operation is in progress */
const endingCampaign = signal(false);

/** Broker ID currently being retried (for loading state) */
const retryingBroker = signal(null);

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
        [STATUS.FAILED]: 1,
        [STATUS.AWAITING]: 2,
        [STATUS.ESCALATED]: 3,
        [STATUS.REJECTED]: 4,
        [STATUS.CONFIRMED]: 5,
        [STATUS.SELECTED]: 6,
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

// ── Event Handlers ──────────────────────────────────────────────────────────

/** Retry all failed brokers -- resets them to SELECTED for re-send (D-04) */
function handleRetryAllFailed() {
  const statuses = campaign.value.statuses || {};
  const selected = campaign.value.brokers.selected || [];
  let count = 0;
  for (const id of selected) {
    const entry = statuses[id];
    if (entry && entry.status === STATUS.FAILED) {
      retryBroker(id);
      count++;
    }
  }
  if (count > 0) {
    addNotification({ type: 'info', message: `${count} broker${count !== 1 ? 's' : ''} queued for retry` });
  }
}

/** End the campaign -- delete temp address and mark ended (D-09, D-10, D-11) */
async function handleEndCampaign() {
  endingCampaign.value = true;
  const result = await endCampaign();
  showEndCampaignDialog.value = false;
  endingCampaign.value = false;
  if (result.deleteSuccess) {
    addNotification({ type: 'success', message: 'Campaign ended. Temporary address deleted.' });
  } else {
    addNotification({ type: 'warning', message: 'Campaign ended locally. Temporary address could not be deleted -- it will expire automatically.' });
  }
}

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

      ${/* ── Stat Cards Grid (D-26, D-04) ── */''}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <${StatCard} label="Sent" count=${counts.sent} color="sky" />
        <${StatCard} label="Awaiting" count=${counts.awaiting} color="amber" />
        <${StatCard} label="Confirmed" count=${counts.confirmed} color="emerald" />
        <${StatCard} label="Rejected" count=${counts.rejected} color="red" />
        <${StatCard} label="Overdue" count=${counts.overdue} color="rose" />
        <${StatCard} label="Failed" count=${counts.failed} color="red" />
      </div>

      ${/* ── Retry All Failed Button (D-04) ── */''}
      ${counts.failed > 0 && !campaign.value.settings?.ended && html`
        <div class="flex justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-[var(--ek-primary)] text-white text-sm font-medium hover:brightness-90 transition-all duration-150"
            onClick=${handleRetryAllFailed}
          >
            Retry All Failed (${counts.failed})
          </button>
        </div>
      `}

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

      ${/* ── Campaign Management Section (D-09, D-10, D-11) ── */''}
      <div class="rounded-xl bg-[var(--ek-surface-alt)] border border-[var(--ek-border)] p-6 mt-6">
        <h3 class="text-sm font-semibold text-[var(--ek-text)] mb-2">Campaign Management</h3>
        ${campaign.value.settings?.ended
          ? html`<p class="text-sm text-[var(--ek-text-muted)]">Campaign ended on ${new Date(campaign.value.settings.endedAt).toLocaleDateString()}. Your campaign data is preserved for your records.</p>`
          : html`
            <p class="text-sm text-[var(--ek-text-muted)] mb-3">
              End your campaign when you are done sending requests. This will delete your temporary email address.
            </p>
            <button
              type="button"
              class="px-4 py-2 rounded-lg border border-red-500/30 text-red-500 text-sm font-medium hover:bg-red-500/10 transition-all duration-150"
              onClick=${() => { showEndCampaignDialog.value = true; }}
            >
              End Campaign
            </button>
          `
        }
      </div>

      ${/* ── End Campaign Confirmation Dialog (D-11) ── */''}
      ${showEndCampaignDialog.value && html`
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick=${(e) => { if (e.target === e.currentTarget && !endingCampaign.value) showEndCampaignDialog.value = false; }}>
          <div class="max-w-md bg-[var(--ek-surface-alt)] rounded-xl border border-[var(--ek-border)] p-6 shadow-2xl space-y-4">
            <h3 class="text-lg font-semibold text-[var(--ek-text)]">End Campaign?</h3>
            <p class="text-sm text-[var(--ek-text-muted)]">
              This will delete your temporary email address. You won't be able to send more requests or receive broker replies. Continue?
            </p>
            <div class="flex gap-3 justify-end">
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--ek-text-muted)] hover:text-[var(--ek-text)] hover:bg-[var(--ek-surface)] transition-colors duration-150"
                onClick=${() => { showEndCampaignDialog.value = false; }}
                disabled=${endingCampaign.value}
              >Cancel</button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all duration-150 ${endingCampaign.value ? 'opacity-60 cursor-wait' : ''}"
                onClick=${handleEndCampaign}
                disabled=${endingCampaign.value}
              >${endingCampaign.value ? 'Ending...' : 'End Campaign'}</button>
            </div>
          </div>
        </div>
      `}
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
  const isFailed = currentStatus === STATUS.FAILED;
  const deadline = statusEntry?.deadline;
  const deadlineInfo = deadline ? formatDeadline(deadline) : null;
  const history = getBrokerHistory(broker.id);
  const campaignEnded = campaign.value.settings?.ended;

  // Status badge
  const colors = STATUS_COLORS[currentStatus] || { bg: 'bg-[var(--ek-surface)]', text: 'text-[var(--ek-text-muted)]' };

  return html`
    <div class="${isOverdue ? 'bg-red-500/5' : isFailed ? 'bg-red-500/5' : ''}">
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
          ${/* D-04: Failed broker error reason */''}
          ${isFailed && statusEntry?.error && html`
            <div class="text-xs text-red-500 mt-0.5">
              ${statusEntry.error.code}: ${statusEntry.error.message}
            </div>
          `}
          ${/* D-28: Deadline display */''}
          ${deadlineInfo && !isFailed && html`
            <div class="text-xs ${deadlineInfo.color} mt-0.5">
              ${deadlineInfo.text}
            </div>
          `}
        </div>

        ${/* D-04: Per-broker Retry button for failed brokers */''}
        ${isFailed && !campaignEnded && html`
          <button
            type="button"
            class="flex-shrink-0 text-xs px-2.5 py-1 rounded border border-red-500/30 text-red-500 font-medium hover:bg-red-500/10 transition-colors duration-150"
            onClick=${(e) => {
              e.stopPropagation();
              retryingBroker.value = broker.id;
              retryBroker(broker.id);
              addNotification({ type: 'info', message: `${broker.name} queued for retry`, brokerId: broker.id });
              retryingBroker.value = null;
            }}
          >Retry</button>
        `}

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

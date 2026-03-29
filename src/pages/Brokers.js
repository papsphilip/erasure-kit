import { html } from 'htm/preact';
import { signal, computed } from '@preact/signals';
import { loadBrokers } from '../lib/brokers-loader.js';
import {
  campaign,
  toggleBrokerSelection,
  selectBrokers,
  deselectBrokers,
  deselectAllBrokers,
} from '../lib/campaign.js';
import { navigateTo, markStepComplete } from '../lib/router.js';

// ── Local UI State (signals -- not persisted) ────────────────────────────────

/** All brokers loaded from brokers.json */
const allBrokers = signal([]);

/** Whether brokers are still loading */
const loading = signal(true);

/** Error message if loading fails */
const loadError = signal(null);

/** Search query string */
const searchQuery = signal('');

/** Region filter ("" = all) */
const regionFilter = signal('');

/** Category filter ("" = all) */
const categoryFilter = signal('');

/** Current sort column: "name" | "region" | "category" */
const sortColumn = signal('name');

/** Sort direction: "asc" | "desc" */
const sortDirection = signal('asc');

/** ID of the currently expanded row (null = none) */
const expandedRow = signal(null);

// ── Load brokers on first render ─────────────────────────────────────────────

let _loadPromise = null;

function ensureBrokersLoaded() {
  if (_loadPromise) return;
  _loadPromise = loadBrokers()
    .then((brokers) => {
      allBrokers.value = brokers;
      loading.value = false;
    })
    .catch((err) => {
      console.error('Failed to load brokers:', err);
      loadError.value = 'Could not load broker database. Make sure brokers.json is available.';
      loading.value = false;
    });
}

// ── Derived Data ─────────────────────────────────────────────────────────────

/** Unique regions for the dropdown */
const regions = computed(() => {
  const set = new Set(allBrokers.value.map((b) => b.region));
  return [...set].sort();
});

/** Unique categories for the dropdown */
const categories = computed(() => {
  const set = new Set(allBrokers.value.map((b) => b.category));
  return [...set].sort();
});

/** Filtered and sorted brokers */
const filteredBrokers = computed(() => {
  let list = allBrokers.value;

  // Search filter (by name, case-insensitive)
  const q = searchQuery.value.toLowerCase().trim();
  if (q) {
    list = list.filter((b) => b.name.toLowerCase().includes(q));
  }

  // Region filter
  if (regionFilter.value) {
    list = list.filter((b) => b.region === regionFilter.value);
  }

  // Category filter
  if (categoryFilter.value) {
    list = list.filter((b) => b.category === categoryFilter.value);
  }

  // Sort
  const col = sortColumn.value;
  const dir = sortDirection.value === 'asc' ? 1 : -1;
  list = [...list].sort((a, b) => {
    const aVal = (a[col] || '').toLowerCase();
    const bVal = (b[col] || '').toLowerCase();
    if (aVal < bVal) return -1 * dir;
    if (aVal > bVal) return 1 * dir;
    return 0;
  });

  return list;
});

/** Selected broker IDs from campaign */
const selectedIds = computed(() => new Set(campaign.value.brokers.selected || []));

/** Number of selected brokers */
const selectedCount = computed(() => selectedIds.value.size);

/** Whether any filter is active */
const hasActiveFilters = computed(
  () => searchQuery.value.trim() !== '' || regionFilter.value !== '' || categoryFilter.value !== ''
);

/** Whether all currently visible brokers are selected */
const allVisibleSelected = computed(() => {
  const visible = filteredBrokers.value;
  if (visible.length === 0) return false;
  const sel = selectedIds.value;
  return visible.every((b) => sel.has(b.id));
});

// ── Event Handlers ────────────────────────────────────────────────────────────

function handleSort(col) {
  if (sortColumn.value === col) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = col;
    sortDirection.value = 'asc';
  }
}

function handleToggleAll() {
  const visible = filteredBrokers.value;
  const visibleIds = visible.map((b) => b.id);
  if (allVisibleSelected.value) {
    deselectBrokers(visibleIds);
  } else {
    selectBrokers(visibleIds);
  }
}

function handleSelectAllVisible() {
  selectBrokers(filteredBrokers.value.map((b) => b.id));
}

function handleClearFilters() {
  searchQuery.value = '';
  regionFilter.value = '';
  categoryFilter.value = '';
}

function handleContinue() {
  markStepComplete('brokers');
  navigateTo('send');
}

function handleToggleExpand(brokerId) {
  expandedRow.value = expandedRow.value === brokerId ? null : brokerId;
}

// ── SVG Icons ────────────────────────────────────────────────────────────────

function SearchIcon() {
  return html`
    <svg class="w-4 h-4 text-[var(--ek-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <circle cx="11" cy="11" r="8" />
      <path stroke-linecap="round" d="m21 21-4.35-4.35" />
    </svg>
  `;
}

function SortIcon({ active, direction }) {
  if (!active) {
    return html`
      <svg class="w-3.5 h-3.5 text-[var(--ek-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4M8 15l4 4 4-4" />
      </svg>
    `;
  }
  return html`
    <svg class="w-3.5 h-3.5 text-[var(--ek-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      ${direction === 'asc'
        ? html`<path stroke-linecap="round" stroke-linejoin="round" d="M8 15l4-4 4 4" />`
        : html`<path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4 4 4-4" />`
      }
    </svg>
  `;
}

function WarningIcon() {
  return html`
    <svg class="w-4 h-4 text-[var(--ek-warning)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  `;
}

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

function ExternalLinkIcon() {
  return html`
    <svg class="w-3.5 h-3.5 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  `;
}

// ── Truncate email for table display ─────────────────────────────────────────

function truncateEmail(email, maxLen = 28) {
  if (!email || email.length <= maxLen) return email;
  return email.slice(0, maxLen - 1) + '\u2026';
}

// ── Brokers Page Component ───────────────────────────────────────────────────

/**
 * Brokers page: search, filter, sort, select/deselect brokers from the database.
 * Displays as a compact table with expandable rows (D-01 through D-16).
 */
export function Brokers() {
  // Trigger broker loading on first render
  ensureBrokersLoaded();

  if (loading.value) {
    return html`
      <div class="max-w-4xl mx-auto px-4 py-16 text-center">
        <div class="animate-pulse space-y-4">
          <div class="h-4 bg-[var(--ek-surface-alt)] rounded w-48 mx-auto"></div>
          <div class="h-8 bg-[var(--ek-surface-alt)] rounded"></div>
          <div class="h-64 bg-[var(--ek-surface-alt)] rounded"></div>
        </div>
      </div>
    `;
  }

  if (loadError.value) {
    return html`
      <div class="max-w-4xl mx-auto px-4 py-16 text-center">
        <p class="text-[var(--ek-danger)]">${loadError.value}</p>
      </div>
    `;
  }

  const visible = filteredBrokers.value;
  const total = allBrokers.value.length;
  const selCount = selectedCount.value;
  const canContinue = selCount > 0;

  return html`
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="rounded-xl bg-[var(--ek-surface-alt)] shadow-lg overflow-hidden">

        ${/* ── Sticky Toolbar (D-06, D-07) ──────────────────────── */''}
        <div class="sticky top-0 z-10 bg-[var(--ek-surface-alt)] border-b border-[var(--ek-border)] p-4 space-y-3">

          ${/* ── Header ──────────────────────────────────────────── */''}
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-[var(--ek-text)]">Select Brokers</h2>
            ${selCount > 0 && html`
              <button
                type="button"
                class="text-sm text-[var(--ek-text-muted)] hover:text-[var(--ek-danger)] transition-colors duration-150"
                onClick=${deselectAllBrokers}
              >
                ${selCount} selected
                <span class="ml-1">\u00D7</span>
              </button>
            `}
          </div>

          ${/* ── Search + Filters Row ──────────────────────────── */''}
          <div class="flex flex-wrap gap-2">
            <div class="relative flex-1 min-w-[200px]">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <${SearchIcon} />
              </div>
              <input
                type="text"
                placeholder="Search brokers..."
                class="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--ek-surface)] border border-[var(--ek-border)] text-[var(--ek-text)] placeholder:text-[var(--ek-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ek-primary)] text-sm"
                value=${searchQuery.value}
                onInput=${(e) => { searchQuery.value = e.target.value; }}
              />
            </div>
            <select
              class="h-10 px-3 rounded-lg bg-[var(--ek-surface)] border border-[var(--ek-border)] text-[var(--ek-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ek-primary)] cursor-pointer"
              value=${regionFilter.value}
              onChange=${(e) => { regionFilter.value = e.target.value; }}
            >
              <option value="">All Regions</option>
              ${regions.value.map((r) => html`<option value=${r}>${r}</option>`)}
            </select>
            <select
              class="h-10 px-3 rounded-lg bg-[var(--ek-surface)] border border-[var(--ek-border)] text-[var(--ek-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ek-primary)] cursor-pointer"
              value=${categoryFilter.value}
              onChange=${(e) => { categoryFilter.value = e.target.value; }}
            >
              <option value="">All Categories</option>
              ${categories.value.map((c) => html`<option value=${c}>${c}</option>`)}
            </select>
          </div>

          ${/* ── Status Bar (D-10, D-11) ──────────────────────── */''}
          <div class="flex items-center justify-between text-xs text-[var(--ek-text-muted)]">
            <div class="flex items-center gap-3">
              <span>Showing ${visible.length} of ${total} brokers</span>
              ${hasActiveFilters.value && html`
                <button
                  type="button"
                  class="text-[var(--ek-primary)] hover:underline"
                  onClick=${handleClearFilters}
                >\u00D7 Clear filters</button>
              `}
            </div>
            ${visible.length > 0 && !allVisibleSelected.value && html`
              <button
                type="button"
                class="text-[var(--ek-primary)] hover:underline"
                onClick=${handleSelectAllVisible}
              >Select all ${visible.length} visible</button>
            `}
          </div>
        </div>

        ${/* ── Table ──────────────────────────────────────────── */''}
        ${visible.length === 0
          ? html`
            <div class="px-4 py-16 text-center">
              <p class="text-[var(--ek-text-muted)] mb-2">No brokers match your search</p>
              <button
                type="button"
                class="text-sm text-[var(--ek-primary)] hover:underline"
                onClick=${handleClearFilters}
              >Try different keywords or clear all filters</button>
            </div>
          `
          : html`
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-[var(--ek-border)] text-left">
                    <th class="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        class="w-4 h-4 rounded cursor-pointer accent-[var(--ek-primary)]"
                        checked=${allVisibleSelected.value}
                        onChange=${handleToggleAll}
                        aria-label="Select all visible brokers"
                      />
                    </th>
                    <${SortableHeader} label="Name" col="name" />
                    <th class="px-3 py-3 text-[var(--ek-text-muted)] font-medium hidden md:table-cell">Email</th>
                    <${SortableHeader} label="Region" col="region" extraClass="hidden sm:table-cell" />
                    <${SortableHeader} label="Category" col="category" extraClass="hidden lg:table-cell" />
                    <th class="w-10 px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  ${visible.map((broker) => html`
                    <${BrokerRow} key=${broker.id} broker=${broker} />
                  `)}
                </tbody>
              </table>
            </div>
          `
        }

        ${/* ── Continue Button (D-16) ─────────────────────────── */''}
        <div class="p-4 border-t border-[var(--ek-border)]">
          <button
            type="button"
            class="w-full h-12 rounded-lg font-semibold text-white transition-all duration-150 ${
              canContinue
                ? 'bg-[var(--ek-primary)] hover:brightness-90 active:brightness-85 cursor-pointer'
                : 'bg-[var(--ek-primary)]/40 cursor-not-allowed'
            }"
            disabled=${!canContinue}
            onClick=${canContinue ? handleContinue : undefined}
          >
            ${canContinue
              ? `Continue to Send \u2192 (${selCount} broker${selCount !== 1 ? 's' : ''})`
              : 'Select at least one broker to continue'
            }
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── Sortable Header Cell ──────────────────────────────────────────────────────

function SortableHeader({ label, col, extraClass = '' }) {
  const isActive = sortColumn.value === col;
  return html`
    <th class="px-3 py-3 ${extraClass}">
      <button
        type="button"
        class="flex items-center gap-1 text-[var(--ek-text-muted)] font-medium hover:text-[var(--ek-text)] transition-colors duration-150"
        onClick=${() => handleSort(col)}
      >
        ${label}
        <${SortIcon} active=${isActive} direction=${sortDirection.value} />
      </button>
    </th>
  `;
}

// ── Broker Row ────────────────────────────────────────────────────────────────

function BrokerRow({ broker }) {
  const isSelected = selectedIds.value.has(broker.id);
  const isExpanded = expandedRow.value === broker.id;
  const tempBlocked = broker.tempEmailAccepted === false;

  return html`
    <tr
      class="border-b border-[var(--ek-border)] transition-colors duration-100 cursor-pointer ${
        isSelected ? 'bg-[var(--ek-primary)]/8' : 'hover:bg-[var(--ek-surface)]/50'
      }"
      onClick=${() => handleToggleExpand(broker.id)}
    >
      <td class="px-4 py-3" onClick=${(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          class="w-4 h-4 rounded cursor-pointer accent-[var(--ek-primary)]"
          checked=${isSelected}
          onChange=${() => toggleBrokerSelection(broker.id)}
          aria-label="Select ${broker.name}"
        />
      </td>
      <td class="px-3 py-3 font-medium text-[var(--ek-text)]">
        <div class="flex items-center gap-1.5">
          <span>${broker.name}</span>
          ${tempBlocked && html`
            <span class="relative group">
              <${WarningIcon} />
              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-[var(--ek-surface)] text-[var(--ek-text)] border border-[var(--ek-border)] rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
                May block temp emails
              </span>
            </span>
          `}
        </div>
      </td>
      <td class="px-3 py-3 text-[var(--ek-text-muted)] hidden md:table-cell">
        <span title=${broker.email}>${truncateEmail(broker.email)}</span>
      </td>
      <td class="px-3 py-3 text-[var(--ek-text-muted)] hidden sm:table-cell">${broker.region}</td>
      <td class="px-3 py-3 text-[var(--ek-text-muted)] hidden lg:table-cell">${broker.category}</td>
      <td class="px-2 py-3 text-[var(--ek-text-muted)]">
        <${ChevronDownIcon} open=${isExpanded} />
      </td>
    </tr>
    ${isExpanded && html`
      <tr class="bg-[var(--ek-surface)]/30">
        <td colspan="6" class="px-4 py-4">
          <${BrokerDetails} broker=${broker} />
        </td>
      </tr>
    `}
  `;
}

// ── Expanded Broker Details ──────────────────────────────────────────────────

function BrokerDetails({ broker }) {
  return html`
    <div class="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <span class="text-[var(--ek-text-muted)] text-xs block mb-0.5">Email</span>
        <a href="mailto:${broker.email}" class="text-[var(--ek-primary)] hover:underline break-all">${broker.email}</a>
      </div>
      <div>
        <span class="text-[var(--ek-text-muted)] text-xs block mb-0.5">Legal Framework</span>
        <span class="text-[var(--ek-text)]">${broker.legalFramework}</span>
      </div>
      ${broker.privacyPortalUrl && html`
        <div>
          <span class="text-[var(--ek-text-muted)] text-xs block mb-0.5">Privacy Portal</span>
          <a href=${broker.privacyPortalUrl} target="_blank" rel="noopener noreferrer" class="text-[var(--ek-primary)] hover:underline break-all">
            ${broker.privacyPortalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            <${ExternalLinkIcon} />
          </a>
        </div>
      `}
      <div>
        <span class="text-[var(--ek-text-muted)] text-xs block mb-0.5">Temp Email</span>
        <span class="text-[var(--ek-text)]">${
          broker.tempEmailAccepted === true ? 'Accepted'
          : broker.tempEmailAccepted === false ? 'May block temp emails'
          : 'Unknown'
        }</span>
      </div>
      ${broker.notes && html`
        <div class="sm:col-span-2">
          <span class="text-[var(--ek-text-muted)] text-xs block mb-0.5">Notes</span>
          <span class="text-[var(--ek-text)]">${broker.notes}</span>
        </div>
      `}
    </div>
  `;
}

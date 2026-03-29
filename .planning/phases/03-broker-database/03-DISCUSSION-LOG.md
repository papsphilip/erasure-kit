# Phase 3: Broker Database - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 03-broker-database
**Areas discussed:** Broker list layout, Search and filter UX, Selection mechanics, Broker data compilation

---

## Broker List Layout

### Display Format

| Option | Description | Selected |
|--------|-------------|----------|
| Compact table | Rows with checkbox, name, email, region, category. Sortable headers. | ✓ |
| Card grid | Each broker as a card with badges | |
| Expandable list | Compact rows, click to expand | |

**User's choice:** Compact table

### Temp-Email-Blocked Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Inline warning icon | Small ⚠ next to name with tooltip | ✓ |
| Badge/pill | Orange pill "Blocks temp email" | |
| You decide | Claude picks | |

**User's choice:** Inline warning icon

### Row Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, expand inline | Click row to show portal URL, notes, framework | ✓ |
| No expansion | All info in table row | |
| You decide | Claude picks | |

**User's choice:** Yes, expand inline

### Column Sorting

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, sortable columns | Click header to sort A-Z/Z-A | ✓ |
| No sorting | Fixed alphabetical order | |
| You decide | Claude decides | |

**User's choice:** Yes, sortable columns

---

## Search and Filter UX

### Filter Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Toolbar above table | Search + Region dropdown + Category dropdown horizontal bar | ✓ |
| Filter chips | Clickable chips below search bar | |
| Sidebar filters | Checkboxes in left sidebar | |

**User's choice:** Toolbar above table

### Filter Combination Logic

| Option | Description | Selected |
|--------|-------------|----------|
| AND between types, inclusive | Region AND Category, multiple values within type are OR | ✓ |
| OR everything | Any matching filter shows broker | |
| You decide | Claude picks | |

**User's choice:** AND between types, values inclusive

### Empty Search State

| Option | Description | Selected |
|--------|-------------|----------|
| Helpful empty state | "No brokers match" with "Clear all filters" link | ✓ |
| Just hide table | Table disappears | |
| You decide | Claude designs | |

**User's choice:** Helpful empty state

### Search Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Instant filter-as-you-type | Immediate filtering | ✓ |
| Debounced (300ms) | Filter after typing pause | |
| You decide | Claude picks | |

**User's choice:** Instant filter-as-you-type

### Count Display

| Option | Description | Selected |
|--------|-------------|----------|
| Result count in toolbar | "Showing 42 of 127 brokers | 12 selected" | ✓ |
| Count on each dropdown | Per-dropdown match count | |
| You decide | Claude designs | |

**User's choice:** Result count in toolbar

### Clear Filters Button

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, always when filtered | "× Clear filters" visible when any filter active | ✓ |
| Only in empty state | Only when no results | |
| You decide | Claude picks | |

**User's choice:** Yes, always when filtered

### Multi-Select Dropdowns

| Option | Description | Selected |
|--------|-------------|----------|
| Single-select dropdowns | One value per dropdown | ✓ |
| Multi-select with checkboxes | Pick multiple values per dropdown | |
| You decide | Claude picks | |

**User's choice:** Single-select dropdowns

### Sticky Toolbar

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, sticky toolbar | Filters stick to top when scrolling | ✓ |
| No, scrolls with content | Toolbar scrolls away | |
| You decide | Claude picks | |

**User's choice:** Yes, sticky toolbar

### Continue Button

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Continue to Send | Disabled until 1+ selected, navigates to Send | ✓ |
| No Continue button | Navigate via stepper | |
| You decide | Claude picks | |

**User's choice:** Yes, Continue to Send

### Table Width

| Option | Description | Selected |
|--------|-------------|----------|
| Wider: max-w-4xl | 896px centered, room for columns | ✓ |
| Same: max-w-2xl | Match Identity form width | |
| Full width | Use all horizontal space | |
| You decide | Claude picks | |

**User's choice:** Wider: max-w-4xl

---

## Selection Mechanics

### Bulk Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Select All visible + per-filter | Header checkbox + "Select all N visible" button | ✓ |
| Header checkbox only | Just Select All in header | |
| You decide | Claude picks | |

**User's choice:** Select All visible + per-filter

### Selection Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Set of broker IDs | campaign.brokers.selected: ["id1", "id2"] | ✓ |
| Full broker objects | Store complete broker objects | |
| You decide | Claude designs | |

**User's choice:** Set of broker IDs
**Notes:** User confirmed selections persist in campaign JSON (localStorage + file saves), leveraging Phase 2 auto-save.

### Selected Row Visual

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox + subtle background | Checked checkbox + light accent tint | ✓ |
| Checkbox only | Just checkbox state | |
| You decide | Claude picks | |

**User's choice:** Checkbox + subtle background

### Deselect All

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in selection count | "12 selected (×)" clickable to clear | ✓ |
| No explicit deselect | Uncheck individually | |
| You decide | Claude picks | |

**User's choice:** Yes, in selection count area

---

## Broker Data Compilation

### Compilation Method

| Option | Description | Selected |
|--------|-------------|----------|
| Research agent compiles | Scrape open-source lists, deduplicate, normalize | ✓ |
| Manual curation | Hand-curate 50-100 brokers | |
| You decide | Claude picks | |

**User's choice:** Research agent compiles

### Broker Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Full schema from requirements | id, name, email, region, category, privacyPortalUrl, legalFramework, tempEmailAccepted, notes | ✓ |
| Minimal schema | id, name, email, region only | |
| You decide | Claude designs | |

**User's choice:** Full schema from requirements

### Region Values

| Option | Description | Selected |
|--------|-------------|----------|
| 4 regions | EU/EEA, UK, US, Other | ✓ |
| Per-country | Individual country codes | |
| You decide | Claude picks | |

**User's choice:** 4 regions

### Category Values

| Option | Description | Selected |
|--------|-------------|----------|
| 6-8 categories | Data Broker, Credit Bureau, People Search, Advertising/Adtech, Analytics, Social Media, Telecom, Other | ✓ |
| 4 categories | Data Broker, Credit/Financial, Marketing/Adtech, Other | |
| You decide | Claude picks | |

**User's choice:** 6-8 categories

---

## Claude's Discretion

- Virtual scrolling implementation
- Tooltip implementation approach
- Expand/collapse animation
- Column width distribution
- Mobile responsive breakpoints
- Duplicate broker detection during compilation
- brokers.json schema validation on load

## Deferred Ideas

None — discussion stayed within phase scope.

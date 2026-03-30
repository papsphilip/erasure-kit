# Phase 4: Email Templates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 04-email-templates
**Areas discussed:** Template preview UI, Template tone & legal depth, Template customization, Clipboard & copy UX

---

## Template Preview UI

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated preview page | New page between Brokers and Send steps | |
| Expand in broker table | Extend existing expandable broker rows | |
| Modal/dialog per broker | Click broker to open centered modal | |
| Other (user-specified) | General template in expandable drawer at top of Brokers page + per-broker sidebar | ✓ |

**User's choice:** General template at top of Brokers page in expandable drawer. Per-broker preview in a right side panel (sidebar) when clicking a broker.
**Notes:** User specified this layout directly — no new wizard step, everything lives on the Brokers page.

### Follow-up: Sidebar position

| Option | Description | Selected |
|--------|-------------|----------|
| Right side panel | Slides in from right, overlays table, broker list stays visible | ✓ |
| Full-width slide-over | Covers full page like a sheet | |
| Bottom drawer | Slides up from bottom | |

**User's choice:** Right side panel
**Notes:** None

---

## Template Tone & Legal Depth

### Legal citations depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full citations | Cite Art. 17(1), Art. 19, Art. 12(3), Art. 12(4). One paragraph per legal basis. | ✓ |
| Minimal citations | Just reference "GDPR Article 17" generally | |
| Two modes — simple & detailed | User toggles between short and full version | |

**User's choice:** Full citations
**Notes:** None

### Regional template differences

| Option | Description | Selected |
|--------|-------------|----------|
| Substantially different | CCPA has different legal basis, terminology, deadline. Template reflects this. | ✓ |
| Same structure, swapped citations | Keep same letter structure, swap article numbers | |
| GDPR-only for now | Only proper templates for EU/EEA and UK, generic for US | |

**User's choice:** Substantially different
**Notes:** None

---

## Template Customization

| Option | Description | Selected |
|--------|-------------|----------|
| Editable textarea | Sidebar shows generated text in editable textarea, per-broker edits | ✓ |
| Read-only with copy | Preview is read-only, user copies and edits in email client | |
| Edit base template only | User customizes general template, per-broker always auto-generated | |

**User's choice:** Editable textarea
**Notes:** User reminded that all state (custom edits, templates) persists in campaign JSON and reloads intact via existing save/load flow.

---

## Clipboard & Copy UX

### Copy mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Copy button in sidebar | "Copy to clipboard" in per-broker sidebar, toast "Copied!" fade | ✓ |
| Copy + mailto: side by side | Two equal buttons — email client and clipboard | |
| Copy as fallback only | Only show copy when mailto: would fail (>2000 chars) | |

**User's choice:** Copy button in sidebar
**Notes:** None

### Bulk copy

| Option | Description | Selected |
|--------|-------------|----------|
| No bulk copy | Per-broker copy only. Bulk sending is Phase 5. | ✓ |
| Copy all as text file | Export all templates as text file with dividers | |

**User's choice:** No bulk copy
**Notes:** None

---

## Claude's Discretion

- Template text structure and exact legal wording
- Campaign JSON schema extension for template storage
- Sidebar width, animation, responsive behavior
- Expandable drawer implementation
- Subject line format per region
- General template drawer vs per-broker sidebar relationship

## Deferred Ideas

None — discussion stayed within phase scope

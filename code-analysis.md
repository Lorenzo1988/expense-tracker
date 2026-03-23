# Data Export Feature: Code Analysis

**Project:** Expense Tracker
**Analysis Date:** 2026-03-23
**Branches Compared:** `feature-data-export-v1`, `feature-data-export-v2`, `feature-data-export-v3`
**Base Branch:** `master`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Version 1 — Simple CSV Export](#version-1--simple-csv-export)
3. [Version 2 — Advanced Multi-Format Export Modal](#version-2--advanced-multi-format-export-modal)
4. [Version 3 — Cloud-Integrated Export Hub](#version-3--cloud-integrated-export-hub)
5. [Cross-Version Comparison](#cross-version-comparison)
6. [Decision Considerations](#decision-considerations)

---

## Executive Summary

| Dimension | V1 | V2 | V3 |
|---|---|---|---|
| **Scope** | Minimal UI wire-up | Full export modal | Full feature hub |
| **New Files** | 0 | 2 | 3 |
| **Lines Added** | ~14 | ~651 | ~1,328 |
| **Export Formats** | CSV only | CSV, JSON, PDF | CSV, JSON, PDF |
| **Filtering** | None (dashboard) / active filters (expenses tab) | Date range + category | Template-driven |
| **Cloud / Sharing** | No | No | Mock (UI only) |
| **Scheduling** | No | No | Mock (UI only) |
| **History** | No | No | Yes (localStorage) |
| **New Dependencies** | None | None | None |
| **Complexity** | Low | Medium | High |

---

## Version 1 — Simple CSV Export

### Files Created/Modified

| File | Change |
|---|---|
| `app/page.tsx` | Added Export Data button (+10 lines) |
| `hooks/useExpenses.ts` | Reordered CSV columns (+0 net, ~4 changed) |

No new files. The `exportCSV` function already existed in the hook — v1 simply adds a UI button to surface it.

### Code Architecture

```
app/page.tsx
  └── onClick → exportCSV(expenses)   ← from useExpenses hook

hooks/useExpenses.ts
  └── exportCSV(filtered: Expense[])
        ├── builds CSV string
        ├── creates Blob
        ├── creates object URL
        ├── simulates <a> click
        └── revokes object URL
```

**Pattern:** Thin UI layer over an existing hook capability. Zero architectural change.

### Key Components & Responsibilities

- **`useExpenses.exportCSV()`** — All export logic. Accepts a pre-filtered array, generates CSV, triggers browser download.
- **Export button in `page.tsx`** — Two instances: dashboard (exports full `expenses[]`), expenses tab (exports `filteredExpenses`).

### Libraries & Dependencies

No new dependencies. Uses only:
- `lucide-react` — `Download` icon
- Browser `Blob` + `URL.createObjectURL` APIs

### How Export Works Technically

```typescript
const header = "Date,Category,Amount,Description\n";
const rows = filtered
  .map(e => `${e.date},${e.category},${e.amount.toFixed(2)},"${e.description.replace(/"/g, '""')}"`)
  .join("\n");
const blob = new Blob([header + rows], { type: "text/csv" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
a.click();
URL.revokeObjectURL(url);
```

- **Generation:** Pure string concatenation, O(n)
- **Escaping:** RFC 4180 — internal quotes doubled (`"` → `""`)
- **Filename:** ISO date-stamped (`expenses-YYYY-MM-DD.csv`)
- **Memory:** Object URL revoked immediately — no leak

### State Management

No new state. Export is a pure side-effect callback (`useCallback` with `[]` deps) — stateless from the component's perspective.

### Error Handling

| Scenario | Handling |
|---|---|
| No expenses | Button is `disabled` (opacity 40, cursor not-allowed) |
| localStorage full | Silent catch in `saveToStorage` |
| Corrupt storage data | Returns `[]` on JSON parse failure |
| Export API failure | No catch — assumes Blob/URL always succeeds on modern browsers |

### Security Considerations

- **CSV injection risk:** Description field is quoted but NOT sanitized against formula injection (values starting with `=`, `+`, `@`, `-`). A description like `=SUM(1+1)` will execute in Excel. Mitigation: prefix dangerous chars with `'`.
- **XSS:** No HTML rendered from user data. React JSX auto-escapes display values.
- **Data locality:** Entirely client-side — no network transmission.

### Performance

- Time: O(n) — linear over filtered expense count
- Memory: Blob created in full, then immediately released
- Suitable for datasets up to ~50,000 rows without noticeable lag

### Code Complexity

**Cyclomatic complexity:** Very low — no branching in the export path.
**Readability:** Excellent — change is 4 modified lines + one button block.
**Maintainability:** High — isolated in hook, easy to modify column order or add formats.

### Extensibility

Adding JSON or PDF export requires only extending `useExpenses` and adding another button or dropdown. The Blob+download pattern is reusable. The biggest gap is the absence of any filtering UI before export from the dashboard.

---

## Version 2 — Advanced Multi-Format Export Modal

### Files Created/Modified

| File | Change | Lines |
|---|---|---|
| `app/page.tsx` | Added modal state + button | +24 / -6 |
| `components/ExportModal.tsx` | **New** — full export modal | 459 |
| `lib/exportUtils.ts` | **New** — export business logic | 168 |

### Code Architecture

```
app/page.tsx
  ├── state: exportOpen (boolean)
  └── <ExportModal isOpen={exportOpen} onClose={...} expenses={expenses} />

components/ExportModal.tsx  (Presentation + local state)
  ├── Format selector (CSV / JSON / PDF)
  ├── Date range inputs (bidirectional constraints)
  ├── Category checkboxes (select-all toggle)
  ├── Filename input
  ├── Live preview table (first 8 records)
  └── Export state machine: idle → exporting → done → (close)

lib/exportUtils.ts  (Pure business logic)
  ├── filterExportData(expenses, options) → Expense[]
  ├── getExportTotal(expenses) → number
  ├── downloadCSV(expenses, filename) → void
  ├── downloadJSON(expenses, filename) → void
  └── downloadPDF(expenses, filename) → void
```

**Pattern:** Separation of concerns — UI state in component, data transformation in pure utility module. The pure functions in `exportUtils.ts` are independently testable.

### Key Components & Responsibilities

**`ExportModal.tsx`**
- Controls all user-facing configuration (format, dates, categories, filename)
- Computes `filtered` via `useMemo` on every filter change
- Drives the export state machine (idle / exporting / done)
- Renders a two-panel layout: configuration (left, `w-72`) + live preview (right)

**`exportUtils.ts`**
- `filterExportData()` — single-pass filter supporting date range and category list
- `downloadCSV/JSON/PDF()` — format-specific builders + browser download trigger
- No React dependencies — plain TypeScript, fully testable in isolation

### Libraries & Dependencies

No new external packages. Uses existing:
- `date-fns` (`parseISO`, `format`) — date comparison in filter
- `lucide-react` — modal and format icons
- `tailwindcss` — `animate-in fade-in zoom-in-95` modal entrance animation

### How Export Works Technically

**CSV** — Identical algorithm to V1:
```typescript
const header = "Date,Category,Amount,Description\n";
const rows = expenses.map(e =>
  `${e.date},${e.category},${e.amount.toFixed(2)},"${e.description.replace(/"/g, '""')}"`
).join("\n");
```

**JSON** — Structured metadata envelope:
```typescript
const data = {
  exportedAt: new Date().toISOString(),
  totalRecords: expenses.length,
  totalAmount: getExportTotal(expenses),
  expenses: expenses.map(({ date, category, amount, description }) => ({
    date, category, amount, description,
  })),
};
// Pretty-printed with JSON.stringify(data, null, 2)
```

**PDF** — HTML-to-print approach (no external PDF library):
```typescript
// 1. Generate complete HTML document with inline CSS and print stylesheet
// 2. Create Blob of type "text/html"
// 3. window.open(objectUrl, "_blank") → triggers auto-print on load
// 4. Fallback: if popup blocked, download as .html file
// 5. setTimeout(() => URL.revokeObjectURL(url), 10_000) — delayed cleanup
```

The print window uses `window.onload = function() { window.print(); }` to auto-trigger the browser's print/save-PDF dialog.

**Shared download trigger:**
```typescript
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### State Management

```typescript
// ExportModal local state
const [format, setFormat] = useState<ExportFormat>("csv");
const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");
const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
const [filename, setFilename] = useState(`expenses-${new Date().toISOString().slice(0, 10)}`);
const [exportState, setExportState] = useState<ExportState>("idle");

// Derived state — memoized
const filtered = useMemo(
  () => filterExportData(expenses, { dateFrom, dateTo, categories: selectedCategories }),
  [expenses, dateFrom, dateTo, selectedCategories]
);
```

**Category selection:** Empty array = "all selected". Clicking a selected-all checkbox deselects that one category (i.e., selects all others).

**Date range constraints:** `dateFrom` input uses `max={dateTo}` and vice versa — native HTML5 prevents invalid ranges.

**Reset on open:**
```typescript
useEffect(() => {
  if (isOpen) { /* reset all fields to defaults */ }
}, [isOpen]);
```

**Export state machine:**
```
idle ──handleExport()──► exporting ──600ms──► done ──1200ms──► idle + onClose()
                                              ↑ exception
                                              └──────────────► idle (error)
```

The 600ms delay provides perceived-progress UX; it's artificial.

### Error Handling

| Scenario | Handling |
|---|---|
| No filtered records | Export button disabled |
| Already exporting | Export button disabled (state guard) |
| Export throws | Caught; state returns to `idle` |
| PDF popup blocked | Falls back to downloading `.html` file |
| localStorage full | Silent catch (inherited from hook) |

### Security Considerations

- **CSV injection:** Same risk as V1 — no formula prefix sanitization on description.
- **XSS in PDF:** Description values interpolated directly into HTML table cells (`<td>${e.description}</td>`). If a description contains `<script>` tags, they execute in the print window. Risk is low in practice (data comes from the same user) but violates defense-in-depth. Fix: HTML-escape description before interpolation.
- **Filename sanitization:** User-controlled filename field — no special character sanitization. Modern browsers handle this gracefully, but `../` path traversal chars could theoretically be passed.
- **Data locality:** No network calls. All export is client-side.

### Performance

- **Filter:** Single-pass O(n) via `Array.filter` with 3 conditions
- **Memoization:** `useMemo` on `filtered` prevents recalculation unless expenses or filters change
- **Preview:** Only first 8 records shown (`PREVIEW_LIMIT = 8`) — full dataset still exported
- **PDF:** Entire dataset built into HTML string synchronously — could lag for 5,000+ records
- **Memory:** CSV/JSON blobs revoked immediately; PDF blob revoked after 10s timeout

### Code Complexity

- **`exportUtils.ts`:** Low complexity — linear transformations, one level of conditionals
- **`ExportModal.tsx`:** Moderate — 459 lines, multiple state variables, conditional rendering across two panels
- **Refactoring opportunity:** Modal could be decomposed into `FormatSelector`, `DateRangeFilter`, `CategoryFilter`, `PreviewTable` sub-components

### Extensibility

- **Add format:** Add to `ExportFormat` union, add button in modal, implement download function in `exportUtils.ts`
- **Add filter:** Extend `filterExportData` options and add UI control
- **Add column selection:** Would require moderate rework of both UI and export builders
- **Note:** Unused `exportCSV` remains in `useExpenses.ts` — should be removed

---

## Version 3 — Cloud-Integrated Export Hub

### Files Created/Modified

| File | Change | Lines |
|---|---|---|
| `app/page.tsx` | Added hub state + button | +33 |
| `components/ExportHub.tsx` | **New** — full hub UI | 922 |
| `hooks/useExportHub.ts` | **New** — hub state hook | 247 |
| `lib/exportTemplates.ts` | **New** — template library | 134 |

### Code Architecture

```
app/page.tsx
  ├── state: hubOpen (boolean)
  └── <ExportHub isOpen={hubOpen} onClose={...} expenses={expenses} />

components/ExportHub.tsx  (Presentation + orchestration, 922 lines)
  ├── Tab: Templates   → TemplatesTab()
  ├── Tab: Send To     → SendToTab()
  ├── Tab: Schedule    → ScheduleTab()
  ├── Tab: History     → HistoryTab()
  ├── buildCSV()       — CSV string builder
  ├── buildJSON()      — JSON string builder
  ├── openPrintWindow() — HTML/print PDF
  ├── triggerDownload() — shared Blob download
  ├── QRCode()         — decorative QR renderer
  ├── CopyButton()     — clipboard utility
  └── ShareSheet()     — share modal overlay

hooks/useExportHub.ts  (State management, 247 lines)
  ├── history: HistoryEntry[]    (localStorage: "export-hub-history")
  ├── schedules: ExportSchedule[]  (localStorage: "export-hub-schedules")
  ├── connections: Connections    (localStorage: "export-hub-connections")
  └── CRUD methods for each

lib/exportTemplates.ts  (Template definitions, 134 lines)
  └── EXPORT_TEMPLATES: ExportTemplate[]
        ├── Monthly Summary  — current month, date desc
        ├── Tax Report       — full year, date asc
        ├── Category Analysis — all time, category sort
        ├── Weekly Digest    — last 7 days
        ├── Year Overview    — Jan 1 → today
        └── Budget Snapshot  — prev month → today
```

**Pattern:** Feature-level decomposition. The hook owns all persistent state; the component is a pure presenter. The template library is declarative — each template is data (filter function + metadata), not imperative code.

### Key Components & Responsibilities

**`ExportHub.tsx`**
Four-tab modal. Each tab is an inline function component (`TemplatesTab`, `SendToTab`, `ScheduleTab`, `HistoryTab`). Houses all format-building logic internally (unlike V2 which extracted it to `exportUtils.ts`).

**`useExportHub.ts`**
Manages three separate localStorage buckets. Returns ~11 methods. Pre-seeds demo data on first load (3 history entries, 1 schedule). History is capped at 30 entries.

**`exportTemplates.ts`**
Each template is:
```typescript
{
  id: TemplateId,
  name: string,
  icon: string,        // emoji
  description: string,
  gradient: string,    // Tailwind gradient classes
  tags: string[],
  getExpenses: (expenses: Expense[]) => Expense[],  // filter + sort
  getLabel: (expenses: Expense[]) => string,        // display label
}
```

Templates use `date-fns` functions (`startOfMonth`, `endOfMonth`, `isWithinInterval`, `parseISO`, `subDays`).

### Libraries & Dependencies

No new external packages. Uses:
- `date-fns` — `startOfMonth`, `endOfMonth`, `isWithinInterval`, `subDays`, `format` (already in project)
- `lucide-react` — extensive icon usage
- `navigator.clipboard` — copy-to-clipboard
- `window.open` + `window.print` — PDF generation

### How Export Works Technically

**Format builders** (defined inside `ExportHub.tsx`):

```typescript
// CSV — identical algorithm to V1/V2
function buildCSV(expenses: Expense[]): string {
  const header = "Date,Category,Amount,Description\n";
  return header + expenses
    .map(e => `${e.date},${e.category},${e.amount.toFixed(2)},"${e.description.replace(/"/g, '""')}"`)
    .join("\n");
}

// JSON — metadata envelope, same structure as V2
function buildJSON(expenses: Expense[]): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    totalRecords: expenses.length,
    totalAmount: expenses.reduce((s, e) => s + e.amount, 0),
    expenses: expenses.map(({ date, category, amount, description }) => ({
      date, category, amount, description,
    })),
  }, null, 2);
}

// PDF — HTML print window, same approach as V2
function openPrintWindow(expenses: Expense[], title: string) { ... }

// Shared download
function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Export flow:**
```typescript
async function handleRun(template, dest, fmt) {
  const data = template.getExpenses(expenses);      // apply template filter
  await new Promise(r => setTimeout(r, 700));        // artificial 700ms delay

  if (dest === "download" || !hub.connections[dest].connected) {
    // Local download
    if (fmt === "csv")  triggerDownload(buildCSV(data), `${template.id}.csv`, "text/csv");
    if (fmt === "json") triggerDownload(buildJSON(data), `${template.id}.json`, "application/json");
    if (fmt === "pdf")  openPrintWindow(data, template.name);
  }
  // Cloud destinations: mock — same local download + history entry

  const entry = hub.addHistoryEntry({ ... });
  setLastEntry(entry);
  setPhase("done");
}
```

### Cloud / Sharing Features (Technical Detail)

**These are UI mock-ups, not real integrations.** No actual API calls are made.

**Connection flow:**
1. User clicks "Connect [Service]"
2. Input for account identifier (email, folder name, Slack channel) is shown
3. 800ms `setTimeout` simulates OAuth handshake
4. `connections[dest]` updated to `{ connected: true, accountLabel, connectedAt }`
5. State persisted to `localStorage["export-hub-connections"]`

**Sending to a connected destination** falls back to local download (same `triggerDownload` path). No HTTP request is made.

**Share URL generation:**
```typescript
shareUrl: `https://xptr.app/s/${Math.random().toString(36).slice(2, 8)}`
```
Random 6-char suffix — not cryptographically secure, domain is a placeholder. Used only for display in the ShareSheet overlay and history entries.

**QR code:** Decorative 21×21 grid generated via a deterministic hash of the share URL. Not RFC 6474 compliant — cannot be scanned. Purely visual.

**Scheduling:**
`ExportSchedule` entries are stored with `frequency`, `nextRun`, and `enabled` flags. The actual schedule execution is never triggered — there is no timer, cron job, or server-side mechanism. Toggling `enabled` only updates the stored flag.

### State Management

Three independent localStorage stores, each loaded once in `useEffect` on mount:

```typescript
const HISTORY_KEY     = "export-hub-history";    // HistoryEntry[], capped at 30
const SCHEDULES_KEY   = "export-hub-schedules";  // ExportSchedule[], unbounded
const CONNECTIONS_KEY = "export-hub-connections";// Record<DestinationId, ConnectionState>
```

**Seed data on first load:** If no data exists in localStorage, pre-populates with 3 demo history entries and 1 weekly schedule to demonstrate the UI.

**ID generation:**
```typescript
id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
```

### Error Handling

| Scenario | Handling |
|---|---|
| localStorage unavailable (SSR) | `typeof window === "undefined"` guard returns fallback |
| localStorage write fails | Silent catch |
| PDF popup blocked | `alert("Allow pop-ups to open the PDF print view.")` |
| Clipboard write fails | `.catch(() => {})` — silent |
| Export throws | Not caught in `handleRun` — unhandled rejection |
| History entry: no cap check | Enforced with `.slice(0, 30)` |

One notable gap: `handleRun` has no try/catch — an exception during file building would leave the component in the `"running"` phase indefinitely.

### Security Considerations

| Risk | Severity | Notes |
|---|---|---|
| CSV injection (description) | Medium | Same as V1/V2 — no formula prefix sanitization |
| XSS in PDF print window | Low-Medium | `e.description` interpolated raw into HTML `<td>` — mitigated by same-origin isolation but not best practice |
| Weak share URL randomness | Low | `Math.random()` is not cryptographically secure — fine for placeholder, must be replaced for production |
| Mock OAuth collects no real credentials | N/A | No actual auth flow — no credential handling risk |
| History entries stored client-side | Low | No sensitive server-side data exposure |

### Performance

| Concern | Assessment |
|---|---|
| Template filtering | O(n) per template, runs only on run/preview — acceptable |
| History list render (30 items) | Not virtualized but 30 items is negligible |
| Schedule list (unbounded) | Could grow large; no limit enforced |
| QR code generation | O(441) per unique URL, memoized with `useMemo` |
| PDF HTML string build | O(n), synchronous — could lag at 5,000+ records |
| `useCallback` / `useMemo` | Used consistently in hook and component |

### Code Complexity

- **`ExportHub.tsx`** — 922 lines, highest complexity. Mixing format builders, sub-component functions, and tab renderers in one file. Multiple levels of conditional rendering. Maintainable today but will become difficult as features grow.
- **`useExportHub.ts`** — 247 lines, moderate complexity. Clear and well-structured; each method is short.
- **`exportTemplates.ts`** — 134 lines, low complexity. Declarative data definitions.

**Key complexity concern:** `handleRun` has 3-level branching (destination connected? → format → destination ID) that would need restructuring as destinations are added.

### Extensibility

**Very strong in designed extension points:**
- **Add template:** One object in `EXPORT_TEMPLATES` array — no other changes needed
- **Add format:** Union type + button + builder function + branch in `handleRun`
- **Add destination:** `DestinationId` union + entry in `DESTINATIONS` metadata + `DEFAULT_CONNECTIONS` + `handleRun` branch
- **Real API integration:** Replace `setTimeout` mock in `handleRun` with `fetch` call — clean swap

**Difficult to extend:**
- Export column selection (requires changes to all format builders)
- Multi-destination bulk send (current UX is single-selection)
- Real scheduling (requires server-side job runner)
- Per-template format overrides (currently global format selection)

---

## Cross-Version Comparison

### Feature Matrix

| Feature | V1 | V2 | V3 |
|---|---|---|---|
| CSV export | ✓ | ✓ | ✓ |
| JSON export | — | ✓ | ✓ |
| PDF export | — | ✓ (print) | ✓ (print) |
| Date range filter | — | ✓ | Via templates |
| Category filter | — | ✓ | Via templates |
| Custom filename | — | ✓ | Partial (uses template ID) |
| Live preview | — | ✓ (8 rows) | — |
| Export templates | — | — | ✓ (6 built-in) |
| Export history | — | — | ✓ (localStorage, 30 cap) |
| Scheduled exports | — | — | ✓ (UI only, no runner) |
| Cloud destinations | — | — | ✓ (UI mock) |
| Share links | — | — | ✓ (placeholder) |
| CSV injection protection | ✗ | ✗ | ✗ |
| XSS-safe PDF | N/A | ✗ | ✗ |

### Architecture Progression

```
V1: hook (existing) ──── button in page.tsx
V2: exportUtils (pure) ── ExportModal (stateful) ── page.tsx
V3: exportTemplates (declarative) ── useExportHub (stateful) ── ExportHub (orchestration) ── page.tsx
```

Each version adds a layer of indirection appropriate to its feature scope.

### CSV Format Consistency

All three versions generate **identical CSV output** for the same input:
```
Date,Category,Amount,Description
2024-01-15,Food,45.50,"Lunch at cafe"
```
Column order, escaping, and decimal format are the same across V1, V2, and V3.

### JSON Format Consistency

V2 and V3 generate **identical JSON output** (same metadata envelope, same field selection, same pretty-print spacing).

### Code Quality Metrics

| Metric | V1 | V2 | V3 |
|---|---|---|---|
| Separation of concerns | Good | Excellent | Good (ExportHub too large) |
| Pure/testable functions | Yes | Yes (exportUtils) | Partially (builders inside component) |
| State management | None needed | Local + useMemo | Hook + localStorage |
| TypeScript coverage | Full | Full | Full |
| Error handling | Minimal | Moderate | Moderate (missing try/catch in handleRun) |
| Security gaps | CSV injection | CSV injection + XSS in PDF | Same as V2 |
| Test coverage | None | None | None |

---

## Decision Considerations

### Choose V1 if:
- The goal is to ship quickly and validate whether users actually use export at all
- The existing `useExpenses.exportCSV` logic is already sufficient
- No multi-format requirement exists now
- Team bandwidth is limited

**Risk:** CSV injection vulnerability should still be patched before shipping.

### Choose V2 if:
- Multiple export formats (CSV/JSON/PDF) are a real user need
- Filtering before export is important (date range, category)
- A clean, testable architecture is a priority (`exportUtils.ts` is independently testable)
- You want the smallest surface area that delivers meaningful UX value
- The "preview before export" pattern has user value

**Recommended additions before shipping:**
1. Remove leftover `exportCSV` from `useExpenses.ts`
2. HTML-escape description in PDF template
3. Add formula-prefix sanitization for CSV injection

### Choose V3 if:
- The cloud/collaboration features are on the actual product roadmap (not just speculative)
- Template-based exports map to real recurring user workflows
- Export history has genuine value (audit, repeat-export)
- The team is committed to replacing the mock integrations with real API calls

**Caution:** V3's scheduling and cloud features are entirely simulated. Shipping this as-is would set incorrect user expectations. The `handleRun` missing try/catch should be fixed.

### Hybrid Path:
V2's architecture (pure utility module + stateful modal) is the strongest foundation. Consider:
- Taking V2 as the base
- Adding V3's **template system** (`exportTemplates.ts`) as a preset-filter feature inside the V2 modal
- Deferring scheduling and cloud integrations until there is a backend to support them

### Shared Issues Across All Versions (Fix Before Shipping)

1. **CSV injection** — sanitize description field:
   ```typescript
   const safe = /^[=+\-@\t\r]/.test(e.description) ? `'${e.description}` : e.description;
   ```

2. **XSS in PDF** (V2 and V3) — HTML-escape user strings before interpolation:
   ```typescript
   function escapeHtml(s: string): string {
     return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
   }
   ```

3. **No test coverage** — all three versions lack unit tests for format builders and filter logic. The pure functions in V2's `exportUtils.ts` are the best starting point.

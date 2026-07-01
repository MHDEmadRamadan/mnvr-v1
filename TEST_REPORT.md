# TEST REPORT

**Date:** 2026-07-01
**Environment:** Local Supabase mirror (schema from `supabase/schema/issues.sql`, with the
`"SSD"` enum aligned to production values `NEW/USED/No`). **Production was never written to.**

---

## 1. Bug reproduction (before fix)

Local `"SSD"` enum aligned to production, then the app's current SSD value was exercised via
`create_maintenance_record`:

| Input | Result |
|-------|--------|
| `ssd: "NEW SSD"` (old app value) | ❌ `400 invalid input value for enum "SSD": "NEW SSD"` |
| `ssd: "NEW"` (production value) | ✅ `200` record created |

This matches the production defect: selecting `NEW SSD`/`USED SSD` in the form breaks
create; existing rows (`NEW`/`USED`) break edit via `z.enum` validation.

## 2. Fix verification (after fix) — CRUD

| Operation | How | Result |
|-----------|-----|--------|
| **Create** | UI → "Add issue", SSD replacement = **NEW** | ✅ "Issue created"; row `SSD-FIX-001 / 860000000000123` added; KPI 1→2 |
| **Read** | `GET /issues?select=…replacements(ssd)` | ✅ returns row with enriched device/vehicle/replacements |
| **Update** | UI → edit, SSD **NEW→USED**, description changed | ✅ "Issue updated"; re-read shows `replacements.ssd = "USED"` and new description |
| **Delete** | `rpc/delete_maintenance_records` | ✅ `{deleted_issues:1, deleted_devices:1, deleted_vehicles:1}`; re-read → `[]` |

The SSD replacement dropdown now offers **NEW / USED / No** (verified visually in create and
edit modals).

## 3. Programmatic checks

| Check | Command | Result |
|-------|---------|--------|
| Types | `npx tsc --noEmit` | ✅ pass |
| Unit tests | `npm test` | ✅ 39 pass / 0 fail |
| Build | `npm run build` | ✅ pass (11 routes) |
| Lint | `npm run lint` | ⚠️ 2 **pre-existing** `react-hooks/set-state-in-effect` errors in `useDebouncedValue.ts` / `useFieldSuggestions.ts` (unrelated to this change; present before it) |

## 4. Notes

- All create/read/update/delete tests ran against the **local** Supabase; the production
  database was accessed **read-only** for schema/enum inspection only.
- Proposed production DB changes (drop redundant `issues.vehicle_id`) were **not executed** —
  see `SQL_MIGRATIONS.sql` (Section B, commented) and `DATABASE_CHANGES.md`.

---

## 5. Phases 2–6 (redesign + cleanup + integration)

### Phase 2 — Database redesign
Normalized target documented in `DATABASE_REDESIGN.md`. Local mirror + `supabase/schema/issues.sql`
already match the target (`SSD` enum `NEW/USED/No`; no redundant `issues.vehicle_id`). Production
migration proposed only (`SQL_MIGRATIONS.sql`).

### Phase 3 — Backend cleanup
Removed dead modules (`device-api.ts`, `form-suggestions/index.ts`, `issues-debug.ts`) and dead
exports (`fetchIssues`, `fetchEnrichedIssuesForDevice`, `SORT_COLUMN_MAP`, `downloadReportCsv`,
`REPORTS_RELATIONSHIP_NOTES`, `formatReplacementEnum`, `isPersistedIssue`, dashboard danger/ghost
tokens, unused `replacements-value-mapper` helpers). De-duplicated `escapeCsv` into `src/lib/csv.ts`.

### Phase 4 — Frontend cleanup
Fixed the 2 `react-hooks/set-state-in-effect` lint errors: `ComboboxField` now syncs the prop into
state during render (no effect); `useFieldSuggestions` annotates its intentional fetch-on-enable.
Removed dead `IssueListResult` and a redundant `IssuesFilterState` re-export. `npm run lint` now
exits 0 (remaining 3 warnings: 1 unfixable TanStack `useReactTable` library warning + 2 intentional
`visibilityKey` cache-busting deps).

### Phase 5 — Integration testing (found + fixed a real bug)
- 🐛 **Fixed pre-existing bug:** `/api/reports/export` returned **500** because
  `buildReportExportBuffer` (server) called `sanitizeText`/`formatDisplayDate` from the
  `"use client"` `cells.tsx`. Extracted pure formatters into server-safe `src/lib/format.ts`
  (re-exported by `cells.tsx`). CSV + XLSX export now return **200**.
- API routes verified against local mirror: `/api/form-suggestions` ✅, `/api/reports/query` ✅,
  `/api/reports/metrics` ✅, `/api/reports/export?format=csv|xlsx` ✅.
- UI walkthrough (recorded): Issues list + create ✅, Reports charts/metrics/table ✅, Export CSV ✅,
  Settings + theme toggle ✅.

### Phase 6 — Final verification

| Check | Command | Result |
|-------|---------|--------|
| Types | `npx tsc --noEmit` | ✅ pass |
| Lint | `npm run lint` | ✅ exit 0 (0 errors; 3 inherent warnings) |
| Unit tests | `npm test` | ✅ 39 pass / 0 fail |
| Build | `npm run build` | ✅ compiled successfully |
| CRUD (local) | UI + REST | ✅ create/read/update/delete |
| Reports + export | UI + API | ✅ |

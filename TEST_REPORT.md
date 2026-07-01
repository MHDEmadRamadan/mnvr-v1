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

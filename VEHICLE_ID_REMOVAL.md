# Schema Normalization: Remove `issues.vehicle_id`

**Objective:** remove the redundant `issues.vehicle_id`; the source of truth is
`issues.device_id → device.id → device.vehicle_id`.

**Safety posture:** production accessed **read-only**; the migration is **generated + tested on a
local mirror only** — no destructive SQL run on production. Zero data loss (data recoverable from
`device`), zero downtime (blue-green staging), zero UI/report breakage (verified), full rollback.

Canonical migration script: `supabase/schema/migrations/20260701_drop_issues_vehicle_id.sql`.

---

## Phase 1 — Dependency discovery + risk map

Exhaustive scan of `vehicle_id` / `vehicleId` across app, SQL, exports, filters, RPCs.

### Direct dependencies on the **`issues.vehicle_id` column**

| # | Location | Kind | How it used the column | Impact of drop |
|---|----------|------|------------------------|----------------|
| 1 | `src/lib/issues-query.ts` `ISSUES_ENRICHED_SELECT` | Backend read | `issues.*` incidentally returned `vehicle_id`; `mapIssueFromRow` **never read it** | LOW — now selects explicit columns (no `*`) |
| 2 | `src/lib/reports/reports-query.ts` `buildReportsSelect` | Backend/report read | same incidental `issues.*` | LOW — now explicit columns |
| 3 | DB `create/update/delete_maintenance_record` | RPC | `create` never inserts it; `update` never sets it; `delete` returns `row_to_json(i)` (ignored by app) | LOW — RPCs unaffected |

**That is the complete set.** Nothing in the app ever *reads* `issues.vehicle_id`.

### NOT dependencies (these are `device.vehicle_id` or the vehicles-PK RPC param — must stay)

| Location | What it really is |
|----------|-------------------|
| `device` table, `device_vehicle_id_idx`, `reports-relationships.sql` | `device.vehicle_id` (authoritative FK) |
| Embeds `vehicle:vehicle_id(...)` in issues/reports selects | `device → vehicles` relation |
| `Issue.vehicleId` (`types/issue.ts`), `mapIssueFromRow` line ~158 | **derived** from `device.vehicle → id` |
| `maintenanceUpdateToRpcPayload` `vehicle_id`, `maintenance-rpc-keys`, RPC `p->>'vehicle_id'` | the **vehicles PK** passed to update the `vehicles` row (not `issues.vehicle_id`) |
| `delete_maintenance_records` `d.vehicle_id` | `device.vehicle_id` |

### Risk map

| Impact | Area | Notes |
|--------|------|-------|
| **HIGH** | External/BI consumers or ad-hoc SQL doing `SELECT vehicle_id FROM issues` | Mitigated by the `issues_safe` compat view (derives `vehicle_id` from `device`). |
| **MEDIUM** | PostgREST schema cache | Must `notify pgrst, 'reload schema'` after DDL (included). |
| **LOW** | App reads (`ISSUES_ENRICHED_SELECT`, `buildReportsSelect`), RPC return shape | App decoupled via explicit selects; nothing reads the column. |
| **NONE** | Frontend filters/aggregations/exports | All operate on `device`-derived `vehicleNumber`, never `issues.vehicle_id`. |

---

## Phase 2 — Data safety alignment

Consistency query (`IS DISTINCT FROM`) on production found **2** drifted rows
(`978a09c2-…`, `7ef0307b-…`) out of 99 populated. The migration's **DATA FIX** (Stage 1B) sets
`issues.vehicle_id = device.vehicle_id` for all divergent rows, then re-verifies **0** mismatches.
(On the local mirror this was reproduced: injected 1 NULL + 1 mismatch → fix → 0 mismatches.)

## Phase 3 — Backward-compatibility layer

`issues_safe` view (valid Postgres — the requested `SELECT * EXCEPT(...)` is BigQuery-only) exposes
all `issues` columns plus `vehicle_id` derived from `device` via `LEFT JOIN` (no row ever dropped).
External consumers can switch to `issues_safe` before the column is dropped and keep working after.

## Phase 4 — Codebase migration (files changed)

The app already resolved the vehicle via `device`, so the only "usage" was the incidental `issues.*`.
Made it explicit to fully decouple from the column:

| File | Change |
|------|--------|
| `src/lib/issues-query.ts` | Added `ISSUES_BASE_FIELDS` (explicit `issues` columns, no `vehicle_id`); `ISSUES_ENRICHED_SELECT` uses it instead of `*` |
| `src/lib/reports/reports-query.ts` | `buildReportsSelect` uses `ISSUES_BASE_FIELDS` instead of `*` |
| `src/lib/issues-api.ts` | cast via `unknown` (supabase-js stricter type from explicit select) |
| `src/lib/maintenance-record-api.ts` | same cast adjustment |
| `src/lib/maintenance-record-test.ts` | same cast adjustment |

No changes were needed to filters, aggregations, exports, API responses, or RPCs — none referenced
`issues.vehicle_id`.

## Phase 5 — Rollout (blue-green)

1. **Stage 1 (non-destructive):** run pre-check + data fix + create `issues_safe`; deploy the app
   (explicit selects). Fully reversible; no downtime.
2. **Validate in prod:** Issues page, Reports, CSV/XLSX export, filters, KPIs.
3. **Stage 2 (destructive):** only after validation, `ALTER TABLE issues DROP COLUMN vehicle_id` +
   reload PostgREST.
4. **Rollback (any time):** recreate the column + backfill from `device` + reload (SECTION R).

## Phase 6 — Migration SQL

Delivered in `supabase/schema/migrations/20260701_drop_issues_vehicle_id.sql`:
1. PRE-CHECK · 2. DATA FIX · 3. VIEW (`issues_safe`) · 4. DROP · 5. ROLLBACK (restore + backfill).

---

## Validation checklist — results (local mirror, prod-like state)

Reproduced the production column (backfilled + 1 NULL + 1 mismatch), ran Stage 1 → app validation →
Stage 2 (drop) → app validation → rollback → restore to final normalized state.

| Check | Pre-drop | Post-drop |
|-------|:-------:|:--------:|
| Issues page loads | ✅ 200 | ✅ 200 |
| Reports module (`/api/reports/query`, `/metrics`) | ✅ 200 | ✅ 200 |
| CSV export | ✅ 200 | ✅ 200 |
| XLSX export | ✅ 200 | ✅ 200 |
| Filters (global search "KA05") | ✅ | ✅ |
| Vehicle numbers display (derived from `device`) | ✅ | ✅ |
| No null vehicle relationships (`device.vehicle_id`) | ✅ 0 nulls | ✅ 0 nulls |
| No broken joins (enriched embed resolves) | ✅ | ✅ |
| Create/Read/Update/Delete | ✅ | ✅ |
| Rollback (recreate + backfill) | — | ✅ 5/5 recovered |
| `tsc` / `lint` / `test` (39) / `build` | ✅ | ✅ |

**End state:** `issues` has **no** `vehicle_id`; vehicle is derived solely from `device`; app and
reports fully functional; migration is backward-compatible during transition and fully reversible.

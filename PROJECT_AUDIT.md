# PROJECT AUDIT — MNVR Maintenance Issues Dashboard

**Date:** 2026-07-01
**Scope:** Compare the **live production Supabase schema** with the application code and the committed schema file (`supabase/schema/issues.sql`); find inconsistencies and bugs; propose safe, migration-based database changes; fix Add/Edit; remove dead code.

**Safety:** No destructive or schema-changing statements were executed against production. Production was accessed **read-only** (via the anon key REST API). All create/read/update/delete verification was performed against a **local Supabase mirror**, never production.

---

## 1. How production was inspected (read-only)

The app talks to Supabase via `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `src/lib/supabase.ts`). Using the production anon key, columns were read from each table (`GET /rest/v1/<table>?select=*&limit=1`), row counts came from `Content-Range`, and enum membership was probed safely with equality filters (`?ssd=eq.NEW%20SSD`, which errors when a label is absent).

### Production tables & row counts

| Table | Rows | Columns (production) |
|-------|-----:|----------------------|
| `vehicles` | 102 | id, vehicle_number, description, created_at |
| `device` | 99 | id, vehicle_id, imei, description, created_at, tickets |
| `device_status` | 99 | id, device_id, software_version, flespi_status, screen_status, dotmatrix_status, ssh_status, pmm_software, description, created_at |
| `hardware` | 99 | id, device_id, motherboard_type, pmm_type, description, created_at |
| `storage` | 99 | id, device_id, ssd_type, disk_health, power_on_hours, power_cycles, power_off, lifetime, summary_ssd, description, created_at |
| `replacements` | 99 | id, device_id, ssd, motherboard, sata_cable, imei_changed, sim_changed, device_changed, description, created_at |
| `issues` | 103 | id, device_id, issue_type, motherboard_issue, pmm_issue, ssd_issue, other_issue, description, created_at, issue_source, **`vehicle_id`** |

### Production enum values (probed)

| Enum | Column | Production labels | App / `issues.sql` labels |
|------|--------|-------------------|---------------------------|
| `"SSD"` | `replacements.ssd` | `NEW`, `USED`, `No` | ❌ `NEW SSD`, `USED SSD`, `No` |
| `"MOTHERBOARD"` | `replacements.motherboard` | `NEW`, `USED`, `No` | ✅ `NEW`, `USED`, `No` |
| `sata_cable` | `replacements.sata_cable` | `NEW`, `USED`, `No` | ✅ `NEW`, `USED`, `No` |

Probe evidence:
- `?ssd=eq.NEW%20SSD` → `400 invalid input value for enum "SSD": "NEW SSD"`
- `?ssd=eq.NEW` → `200 [ {…} ]`

---

## 2. Findings

### 🔴 BUG-1 (CRITICAL, production-breaking) — SSD replacement enum mismatch

**Production** `replacements.ssd` is enum `"SSD"` with labels `NEW / USED / No`.
**Application** offers `NEW SSD / USED SSD / No`:

- `src/types/replacements.ts` — `ReplacementSsd = "NEW SSD" | "USED SSD" | "No"`, `REPLACEMENT_SSD_OPTIONS = ["NEW SSD","USED SSD","No"]`
- `src/config/maintenance-form-config.ts` — SSD field uses `REPLACEMENT_SSD_OPTIONS`
- `src/lib/maintenance-record-schema.ts` — `ssd: z.enum(REPLACEMENT_SSD_OPTIONS)`

**Impact — Add is broken:** picking `NEW SSD`/`USED SSD` in the form makes `create_maintenance_record` execute `... ::public."SSD"` with an invalid label → Postgres `22P02 invalid input value for enum "SSD"`. The whole create transaction fails; only `No` works.

**Impact — Edit is broken:** the 99 existing devices store `ssd` = `NEW`/`USED`. Loading such a record into the form yields `ssd = "NEW"`, which is **not** in `REPLACEMENT_SSD_OPTIONS`, so `maintenanceRecordFormSchema` (`z.enum`) rejects it on save → the edit cannot be saved.

**Reproduced** on a local mirror (enum aligned to production): create with `ssd:"NEW SSD"` → `400 invalid input value for enum "SSD"`; with `ssd:"NEW"` → `200`.

**Fix (applied):** align the app to production — `ReplacementSsd = "NEW" | "USED" | "No"` and `REPLACEMENT_SSD_OPTIONS = ["NEW","USED","No"]`. Production is already correct, so **no production migration is required** for this; the committed `supabase/schema/issues.sql` was also corrected (it created the enum with the wrong labels for fresh installs).

### 🟠 BUG-2 (schema drift / normalization) — orphan `issues.vehicle_id`

Production `issues` has an extra `vehicle_id` column (populated in 99/103 rows) that is **absent** from `supabase/schema/issues.sql` and from all RPCs.

- It is redundant: a vehicle is already reachable via `issues.device_id → device.vehicle_id → vehicles`. The app reads the vehicle exclusively through that join (`ISSUES_ENRICHED_SELECT`, `mapIssueFromRow`), never from `issues.vehicle_id`.
- `create_maintenance_record` never sets it, so app-created rows have `vehicle_id = NULL` (the 4 NULL rows) while legacy rows keep a value → inconsistent data.
- The app's `vehicleId` in the RPC update payload maps to the **vehicles** PK used to update the `vehicles` table, not to `issues.vehicle_id` — so this column is pure dead weight.

**Recommendation:** drop `issues.vehicle_id` to normalize (denormalized/duplicated FK). This is a destructive change on production, so it is **only proposed**, never executed — see `DATABASE_CHANGES.md` / `SQL_MIGRATIONS.sql` (guarded, commented, requires human review + backup).

### 🟠 BUG-3 — committed schema file is stale vs production

`supabase/schema/issues.sql` is labelled "authoritative" but diverges from production: wrong `"SSD"` enum labels (BUG-1) and missing `issues.vehicle_id` (BUG-2). Fixed the enum in the file; intentionally left `vehicle_id` out because the normalized target is to drop it.

### 🟡 Dead code / duplicated logic

| Location | Item | Status |
|----------|------|--------|
| `src/lib/issues-mapper.ts` | `mapIssueToRow()`, `mapIssueUpdateToRow()` — return `{}`, unused | removed |
| `src/lib/issues-mapper.ts` | `new_ssd/new_motherboard/new_sata_cable` legacy boolean fallbacks — those columns were dropped from production (migration `20250609`) and are not in the select | removed |
| `src/lib/maintenance-record-rpc.ts` | `sanitizeMaintenanceRpcPayload()` — deprecated, no callers | removed |
| `src/lib/maintenance-record-rpc.ts` | `extractUuidString` / `extractOptionalUuidString` marked `@deprecated` but are the **only** UUID helpers used by the mapper | kept; misleading `@deprecated` removed |
| `src/lib/issues-query.ts` | `ISSUES_SELECT` deprecated alias — no callers | removed |

**Duplicated logic (recommended, not changed):** the Reports module (`src/lib/reports/*`) re-implements issue enrichment/filtering/metrics that overlap with `src/lib/issues-*`. Consolidating is a larger refactor with production-read risk and is **recommended** rather than performed here to keep this change safe and reviewable.

### ✅ CRUD verification summary (local mirror)

| Op | Path | Result |
|----|------|--------|
| Create | `create_maintenance_record` via UI, SSD=`NEW` | ✅ succeeds (previously failed) |
| Read | `ISSUES_ENRICHED_SELECT` | ✅ returns enriched row incl. `replacements.ssd` |
| Update | `update_maintenance_record` via UI, SSD `NEW`→`USED` | ✅ persisted |
| Delete | `delete_maintenance_records` | ✅ cascades issue→device→vehicle |

Details in `TEST_REPORT.md`.

---

## 3. Change inventory

**Application code (applied):**
- `src/types/replacements.ts` — SSD type & options → `NEW/USED/No`.
- `src/lib/issues-mapper.ts` — read `replacements.ssd/motherboard/sata_cable` directly; drop legacy `new_*` fallbacks; remove dead `mapIssueToRow`/`mapIssueUpdateToRow`.
- `src/lib/maintenance-record-rpc.ts` — remove dead `sanitizeMaintenanceRpcPayload`; de-deprecate the in-use UUID helpers.
- `src/lib/issues-query.ts` — remove dead `ISSUES_SELECT` alias.
- Tests updated to the corrected value: `src/lib/maintenance-form-audit.test.ts`, `src/lib/maintenance-record-test.ts`.

**Schema file (applied):**
- `supabase/schema/issues.sql` — `"SSD"` enum → `('NEW','USED','No')`.

**Proposed production DB changes (NOT executed):** see `DATABASE_CHANGES.md` and `SQL_MIGRATIONS.sql`.

---

## 4. Follow-up architectural verification (full structural pass)

A complete read-only structural verification of production vs. the app was performed — see
`ARCHITECTURE_VERIFICATION.md`. No new functional/correctness bugs were found beyond those fixed in
Phases 1–6. New findings:

| ID | Severity | Finding |
|----|----------|---------|
| V-1 | Medium | `issues.vehicle_id` (redundant FK) has **drifted** — 2/99 rows disagree with `device.vehicle_id`. Resolved by the already-proposed column drop (`SQL_MIGRATIONS.sql` §B). App unaffected (reads via `device.vehicle_id`). |
| V-2 | High | Public anon key has full read/write/delete on all data (no auth; open RLS). Mitigation proposed in `SQL_MIGRATIONS.sql` §C (needs product decision; not executed). |
| V-3 | Low→Medium | Client-side fetch of up to 10k enriched rows + client filter/sort/paginate; non-sargable KPI `ilike` queries. Recommendation only. |
| V-4 | Low | Full enumeration of prod functions/triggers/views not possible with anon-only; recommend a `service_role` `supabase db pull` to lock a baseline. |
| V-5 | Low | Residual Reports/Issues duplication (select builders, filter appliers, `computeTotalPages`, row→string mappers) documented for a future, separately-tested refactor. |

Verified consistent: all app-used FK relations resolve against production; enums aligned
(`NEW/USED/No`); only column-level schema drift is `issues.vehicle_id`; `delete_maintenance_record`
RPC confirmed present (safe no-op probe); CRUD + Reports + Settings flows pass on the local mirror.

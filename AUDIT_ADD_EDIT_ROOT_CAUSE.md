# Audit — ADD/EDIT failure (authoritative: pulled production schema)

**Source of truth:** `supabase/migrations/20260702151644_remote_schema.sql` (from `supabase db pull`).
All conclusions below are verified against that file and reproduced on a local replica built from
it (`supabase db reset`). No assumptions.

---

## 1. Root cause (confirmed, not inferred)

`create_maintenance_record` and `update_maintenance_record` both call
`public.record_device_vehicle_assignment(uuid, uuid)`, which **reads and writes
`public.device_vehicle_history`** — a table that **is never created** in the production schema.

Evidence in the pulled schema:
- `record_device_vehicle_assignment` references `public.device_vehicle_history` at **lines 370, 375, 379, 383**.
- It is invoked by `create_maintenance_record` at **lines 196 and 248**, and by
  `update_maintenance_record` at **lines 450 and 457**.
- `grep -c "create table .* device_vehicle_history"` in the pulled schema = **0** → the table does not exist.

Reproduced on the local replica (built from the pulled schema):
```
POST /rest/v1/rpc/create_maintenance_record
→ 404 {"code":"42P01","message":"relation \"public.device_vehicle_history\" does not exist"}
```
This is the exact production error. `update_maintenance_record` fails identically because it calls
`record_device_vehicle_assignment` unconditionally at line 457.

**Classification: Critical. The database is wrong (missing table); the application code is correct.**
DELETE is unaffected (`delete_maintenance_records` never calls the assignment function) — consistent
with only ADD/EDIT failing.

---

## 2. Execution path (frontend → PostgreSQL)

**ADD:** `IssueModal` → `handleSave` (`src/app/issues/page.tsx`) → `create` (`useIssues`) →
`createIssue` (`src/lib/issues-api.ts`) → `createMaintenanceRecord` (`src/lib/maintenance-record-api.ts`)
→ `safeMaintenanceRpcCall("create_maintenance_record")` (`src/lib/maintenance-record-rpc.ts`) →
`supabase.rpc(...)` → **`public.create_maintenance_record`** → `record_device_vehicle_assignment`
→ **`INSERT/SELECT public.device_vehicle_history` → 42P01** → whole transaction rolls back.

**EDIT:** same chain via `updateIssue` → `updateMaintenanceRecord` →
`safeMaintenanceRpcCall("update_maintenance_record")` → **`public.update_maintenance_record`**
→ `record_device_vehicle_assignment` (line 457) → **42P01**.

**DELETE:** `deleteIssues` → `delete_maintenance_records` → no history reference → **works**.

---

## 3. Code vs. real production schema — every mismatch

Enumerated every table/column/RPC the app touches (`.from(...)`, `.rpc(...)`, embeds,
`FORM_SUGGESTION_FIELD_SOURCES`) and checked it against the pulled schema.

| App usage | Prod schema | Status |
|-----------|-------------|--------|
| `.from("issues")` cols: id, device_id, created_at, issue_type, issue_source, motherboard_issue, pmm_issue, ssd_issue, other_issue, description | present | ✅ |
| Suggestions: `device_status`(software_version, flespi_status, screen_status, dotmatrix_status), `hardware`(motherboard_type, pmm_type), `storage`(ssd_type), `issues`(…) | present | ✅ |
| Embeds `device:device_id`, `vehicle:vehicle_id`, `device_status`, `hardware`, `storage`, `replacements` | FKs `fk_device_issues`, `fk_vehicle`, `fk_device_*` present | ✅ |
| RPC `create_maintenance_record(p jsonb)` / `update_maintenance_record(p jsonb)` / `delete_maintenance_records(uuid[])` | present, signatures match | ✅ |
| Update payload keys: `issue_id, device_id, vehicle_id, *_id`, form fields | consumed by prod `update_maintenance_record` | ✅ |
| Enums SSD/MOTHERBOARD/sata_cable = `NEW/USED/No` | `NEW/USED/No` | ✅ (earlier SSD code fix is validated correct) |

**No application-code mismatch exists.** No app object references `device_vehicle_history` (the
missing object lives inside DB functions). Therefore **no code change is required** for this bug.

### Notes / non-blocking observations
- `issues.vehicle_id` still exists in prod (redundant). The app no longer selects it (explicit
  `ISSUES_BASE_FIELDS`), so it is harmless; its removal remains an optional future migration.
- `public.issues_safe` view exists in prod (deployed out-of-band). Unused by the app; harmless.
- Prod contains helpers not in the old hand-written `supabase/schema/*.sql`
  (`coerce_replacement_*`, `get_vehicle_by_number`, `record_device_vehicle_assignment`,
  upsert-based create logic, `device.imei` UNIQUE, `device.vehicle_id ON DELETE SET NULL`). These
  are captured by the pulled migration, which is now the source of truth; the legacy
  `supabase/schema/` files are superseded (documentation drift only).

---

## 4. Missing objects / migrations

| Object | Type | Status | Action |
|--------|------|--------|--------|
| `public.device_vehicle_history` | table | **MISSING**, referenced by `record_device_vehicle_assignment` | **Do NOT create** — remove the dependency (orphaned/unconsumed feature) |
| `public.record_device_vehicle_assignment` | function | present but orphaned (no consumer, broken) | **drop it** + strip its calls from the two RPCs |
| everything else app-facing | tables/views/functions | present | none |

No trigger references it (repo/prod define no triggers); the dependency is via the function.

---

## 5. Fix — REMOVE the orphaned dependency (no new tables)

> **Decision update:** rather than creating `device_vehicle_history`, the dependency is removed,
> because `record_device_vehicle_assignment` is an orphaned/incomplete feature — its table never
> existed and no application code consumes it. See `RECORD_DEVICE_VEHICLE_ASSIGNMENT_ANALYSIS.md`.
> The earlier `20260702160000_create_device_vehicle_history.sql` migration has been **withdrawn**.

`supabase/migrations/20260702170000_remove_device_vehicle_history_dependency.sql`:
- `CREATE OR REPLACE` `create_maintenance_record` / `update_maintenance_record` identical to
  production **minus** the four `perform record_device_vehicle_assignment(...)` calls.
- `DROP FUNCTION public.record_device_vehicle_assignment(uuid, uuid)`.
- Creates **no** new tables.

To apply to production (reviewed operator action): `supabase db push` (or run the migration), then
`notify pgrst, 'reload schema';`.

---

## 6. Verification (local replica of the pulled schema)

| Step | Result |
|------|--------|
| `supabase db reset` with pulled schema only | ADD RPC → **42P01 device_vehicle_history missing** (bug reproduced) |
| Add fix migration + `supabase db reset` | applies both migrations cleanly |
| ADD via RPC (`ssd=NEW`) | ✅ issue created |
| EDIT via RPC (`ssd=USED`, new type) | ✅ issue updated; `device_vehicle_history` has 1 open row |
| DELETE via RPC | ✅ `{deleted_issues:1, deleted_devices:1, deleted_vehicles:1}` |
| UI ADD (`FIXED-ADD-1`) + EDIT (`Edited after fix`) | ✅ both succeed, success toasts, no error (video) |
| `tsc` / `lint` / `test` (39) / `build` | ✅ (no code change needed; still green) |

---

## 7. Summary

- **Why ADD/EDIT fail:** production functions call `record_device_vehicle_assignment`, which uses the
  non-existent table `public.device_vehicle_history` → `42P01` on every create/update.
- **DB or code wrong:** **DB** (a function references a table that never existed). **No application
  code is wrong** for this failure.
- **Fix (chosen):** apply `supabase/migrations/20260702170000_remove_device_vehicle_history_dependency.sql`
  — strip the orphaned `record_device_vehicle_assignment` calls from the two RPCs and drop the
  function. **No new tables.** (See `RECORD_DEVICE_VEHICLE_ASSIGNMENT_ANALYSIS.md`.)
- **Not caused by the earlier `issues.vehicle_id` work:** that drop was never applied to production
  (column still present), and it is unrelated to `device_vehicle_history`.

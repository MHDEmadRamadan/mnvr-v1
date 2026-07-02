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
| `public.device_vehicle_history` | table | **MISSING** (referenced by `record_device_vehicle_assignment`) | **create it** (migration below) |
| everything else app-facing | tables/views/functions | present | none |

No trigger references it (repo/prod define no triggers); the dependency is via the function.

---

## 5. Fix — migration (generated, tested; NOT applied to production)

`supabase/migrations/20260702160000_create_device_vehicle_history.sql` creates the table. The column
set is derived from the function's usage (`device_id`, `vehicle_id`, open-assignment via
`unassigned_at IS NULL`):

```sql
create table if not exists public.device_vehicle_history (
  id            uuid primary key default gen_random_uuid(),
  device_id     uuid not null references public.device(id)    on delete cascade,
  vehicle_id    uuid not null references public.vehicles(id)  on delete cascade,
  assigned_at   timestamptz not null default now(),
  unassigned_at timestamptz
);
-- + indexes (device_id; partial where unassigned_at is null), RLS, anon/authenticated/service_role grants
```

To apply to production (reviewed operator action): `supabase db push` (or run the migration in the
SQL editor), then `notify pgrst, 'reload schema';`. It is idempotent (`create table if not exists`,
`create index if not exists`).

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
- **DB or code wrong:** **DB** (missing table). **No application code is wrong** for this failure.
- **Fix:** apply `supabase/migrations/20260702160000_create_device_vehicle_history.sql` to production.
- **Not caused by the earlier `issues.vehicle_id` work:** that drop was never applied to production
  (column still present), and it is unrelated to `device_vehicle_history`.

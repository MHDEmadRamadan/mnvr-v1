# Phase 2 — Database Redesign (Normalized Target)

Builds on `PROJECT_AUDIT.md`. Goal: a clean, normalized schema that matches how the
application actually uses the data, expressed as **migration files** (nothing executed on
production). The committed `supabase/schema/issues.sql` and the local mirror already reflect
this target; production reaches it via the reviewed migration in `SQL_MIGRATIONS.sql`.

## Target model (3NF)

```
vehicles (1) ──< (N) device (1) ──┬──< (N) issues
                                  ├──< (N) device_status   (latest row used by UI)
                                  ├──< (N) hardware        (latest row used by UI)
                                  ├──< (N) storage         (latest row used by UI)
                                  └──< (N) replacements    (latest row used by UI)
```

- **`vehicles`** — `id` PK, `vehicle_number`, `description`, `created_at`.
- **`device`** — `id` PK, `vehicle_id` FK→vehicles (`on delete cascade`), `imei`, `description`, `tickets`, `created_at`.
- **`device_status` / `hardware` / `storage` / `replacements`** — `id` PK, `device_id` FK→device (`on delete cascade`), attribute columns, `created_at`. The UI reads the most recent row per device (`pickLatest`).
- **`issues`** — `id` PK, `device_id` FK→device (`on delete cascade`), issue attribute columns, `created_at`.

## Changes vs. current production

| # | Change | Type | Status |
|---|--------|------|--------|
| 1 | `"SSD"` enum labels `NEW SSD/USED SSD/No` → **`NEW/USED/No`** | enum correctness | Production already correct; app + schema file fixed. Idempotent realignment migration = `SQL_MIGRATIONS.sql` §A (no-op on prod). |
| 2 | **Drop redundant `issues.vehicle_id`** (duplicates `device.vehicle_id`; unused by app; drifts to NULL) | normalization (destructive) | Proposed only — `SQL_MIGRATIONS.sql` §B (guarded, commented, requires backup + review). Local mirror & schema file already omit it. |

After change 2, a vehicle is reached solely via `issues.device_id → device.vehicle_id → vehicles`, removing the duplicated foreign key (2NF/3NF: no redundant, independently-updatable copy of the vehicle link on `issues`).

## Referential integrity (already in place, retained)

- All child tables FK to their parent with `on delete cascade`.
- `delete_maintenance_records()` additionally garbage-collects orphaned `device` and `vehicles`
  rows after issue deletion (verified: delete cascades issue → device → vehicle).
- RLS enabled on all tables with anon/authenticated policies (see `supabase/schema/issues.sql`).

## Deferred (documented, NOT changed — production compatibility / risk)

These would require coordinated app + data migration and are recorded for a future, separately
reviewed effort:

- `replacements.imei_changed` / `sim_changed` are `text` storing `"false"` or an IMEI/SIM value
  (a value-or-flag overload). A cleaner model is a nullable value column (NULL = no change).
  Requires a data backfill + app mapper change; deferred.
- `device_status`/`hardware`/`storage`/`replacements` are modeled 1:N but used as 1:1-latest.
  Enforcing 1:1 (or a `is_current` flag / view) is possible but changes write semantics; deferred.

## Verification

- Local mirror `issues` columns: no `vehicle_id`; `"SSD"` enum = `NEW/USED/No` (confirmed via `information_schema`/`pg_enum`).
- Full CRUD (incl. cascade delete) verified on the local mirror — see `TEST_REPORT.md`.

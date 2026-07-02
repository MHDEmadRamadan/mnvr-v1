# Is `record_device_vehicle_assignment` required? — analysis + fix (no new tables)

Authoritative source: `supabase/migrations/20260702151644_remote_schema.sql` (`supabase db pull`).

## 1. Complete SQL definitions

### `record_device_vehicle_assignment` (the orphaned function)
```sql
CREATE OR REPLACE FUNCTION public.record_device_vehicle_assignment(p_device_id uuid, p_new_vehicle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare
  v_current_vehicle_id uuid;
begin
  if p_device_id is null or p_new_vehicle_id is null then
    return;
  end if;

  select vehicle_id into v_current_vehicle_id from public.device where id = p_device_id;

  if v_current_vehicle_id is null then
    return;
  end if;

  if v_current_vehicle_id is distinct from p_new_vehicle_id then
    update public.device_vehicle_history
      set unassigned_at = now()
      where device_id = p_device_id and unassigned_at is null;
    insert into public.device_vehicle_history (device_id, vehicle_id)
      values (p_device_id, p_new_vehicle_id);
  elsif not exists (
    select 1 from public.device_vehicle_history
    where device_id = p_device_id and unassigned_at is null
  ) then
    insert into public.device_vehicle_history (device_id, vehicle_id)
      values (p_device_id, p_new_vehicle_id);
  end if;
end;
$$;
```

### `create_maintenance_record` and `update_maintenance_record`
Full bodies are in the pulled schema (`create` lines 159–275, `update` lines 393–514). The only
lines relevant here are the calls to the function above:
- `create_maintenance_record`: line **196** (device reused by IMEI) and line **248** (new device).
- `update_maintenance_record`: line **450** (new device inserted) and line **457** (unconditional,
  right before the `update public.device`).

## 2. Why it exists

`record_device_vehicle_assignment` implements an **audit/history feature**: it maintains
`public.device_vehicle_history` as a slowly-changing log of which vehicle a device is assigned to
over time — closing the previous open row (`unassigned_at = now()`) and opening a new one whenever a
device's vehicle changes. It is called from the maintenance create/update flows so that assignment
changes are recorded automatically.

## 3. Classification: **orphaned / incomplete dependency** (effectively dead for the app)

Evidence (all verified, not assumed):
- **Its backing table `public.device_vehicle_history` does not exist** in the pulled production
  schema (`0` `CREATE TABLE`), so the function has **never successfully run** — every call raises
  `42P01`. The feature has never worked in production.
- **No application code references** `record_device_vehicle_assignment`, `device_vehicle_history`, or
  any device↔vehicle assignment-history concept (`rg` over `src/`, `scripts/` → 0 hits). No query,
  view, report, type, or UI consumes a history.
- The function is called **only** by the two maintenance RPCs (create 2×, update 2×); nothing else
  uses it.

Because there is **no consumer** and the **table never existed**, I **cannot prove** it is part of
the intended, working design. It is an orphaned dependency that only breaks ADD/EDIT.

## 4. Fix — remove the dependency (no new tables)

`supabase/migrations/20260702170000_remove_device_vehicle_history_dependency.sql`:
- `CREATE OR REPLACE` `create_maintenance_record` and `update_maintenance_record` **identical to
  production except** the four `perform public.record_device_vehicle_assignment(...)` calls are
  removed. All other behavior (vehicle upsert, device reuse-by-IMEI, latest-row upserts for
  status/hardware/storage/replacements, issue insert/update, JSON return) is byte-for-byte
  preserved.
- `DROP FUNCTION public.record_device_vehicle_assignment(uuid, uuid)` (now unused).
- No table is created.

## 5. Should `device_vehicle_history` be created instead? — **No (not provably intended)**

Per the requirement to only create it if provably part of the intended schema: it is **not** —
the table is absent from production, absent from the repo, and unconsumed by the application. The
create-table migration proposed in the previous turn has been **withdrawn/deleted** in favor of the
dependency-removal migration.

If a device↔vehicle assignment history is genuinely wanted in the future, it should be introduced as
a deliberate, complete feature (table **and** a consuming UI/report/query designed together), not to
satisfy an orphaned function call.

## 6. Verification (local replica of the pulled schema)

| Check | Result |
|-------|--------|
| `supabase db reset` (pulled schema + removal migration) | applies cleanly |
| `public.device_vehicle_history` | not created (`to_regclass` → NULL) |
| `record_device_vehicle_assignment` | dropped (`pg_proc` count = 0) |
| public base tables | 7 (unchanged) |
| ADD / EDIT / DELETE via RPC | ✅ all succeed |
| UI ADD (`NODEP-ADD`) + EDIT (`No-dep edit`) | ✅ success toasts, no error |
| `tsc` / `test` (39) | ✅ (no app code change needed) |

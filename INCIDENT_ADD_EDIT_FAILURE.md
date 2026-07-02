# Incident Audit — ADD/EDIT failing: `relation "public.device_vehicle_history" does not exist`

**Date:** 2026-07-02 · **Mode:** READ-ONLY production audit (anon key only). No writes, no DDL,
no RPC calls were made against production. **No fixes implemented.**

---

## 1. Executive summary / root cause

ADD and EDIT fail because a **database trigger/function that exists in PRODUCTION references a table
that does not exist**: `public.device_vehicle_history`. Every `INSERT`/`UPDATE` on the underlying
table the trigger is attached to (evidence points to **`public.device`**, possibly `public.vehicles`)
aborts with PostgreSQL error `42P01 relation "public.device_vehicle_history" does not exist`, which
rolls back the whole `create_maintenance_record` / `update_maintenance_record` transaction and
surfaces to the UI.

- `device_vehicle_history` and **any** trigger appear **nowhere in this repository** (0 matches;
  the repo defines **no triggers at all**). The object is **production drift introduced outside the
  codebase** (Supabase dashboard or an out-of-band migration).
- This is **NOT** caused by my previous work. My migration only ever (optionally) creates the
  `issues_safe` view (which references `device`, not `device_vehicle_history`) and drops
  `issues.vehicle_id` — the drop was **not** applied to production (see §6).

**This is a broken in-database dependency, not an application bug.** No application code change can
fix it; it requires a DB change (recreate the missing table, or remove the broken trigger/function).

---

## 2. Read-only production evidence

| Check | Command (anon REST) | Result |
|-------|---------------------|--------|
| Missing table | `GET /rest/v1/device_vehicle_history` | `404 PGRST205 "Could not find the table 'public.device_vehicle_history' in the schema cache"` |
| Core tables present | `GET /rest/v1/{vehicles,device,device_status,hardware,storage,replacements,issues}` | all `200` |
| No history/audit tables | probed `device_history, vehicle_history, device_audit, audit_log, history, device_vehicle` | all `404` |
| Repo scan | `rg -i "device_vehicle_history|create trigger"` | 0 code references; **repo defines no triggers** |

Because the trigger/function bodies live in `pg_trigger` / `pg_proc`, and the anon key cannot read
the catalog, the trigger **definition** could not be dumped directly. Its existence is proven by the
production error message + the fact the object is absent from the repo. §7 gives the exact read-only
catalog queries to confirm the trigger name/table/definition with a `service_role` key or DB
connection.

---

## 3. Complete execution path (frontend → PostgreSQL)

### EDIT
1. `src/app/issues/page.tsx` → `handleSave()` → `update(editingId, values)` (from `useIssues`).
2. `src/hooks/useIssues.ts` `update()` → `apiUpdate` = `updateIssue` (`src/lib/issues-api.ts`).
3. `src/lib/issues-api.ts` `updateIssue()` → `updateMaintenanceRecord()` (`src/lib/maintenance-record-api.ts`).
4. `maintenance-record-api.ts` → `safeMaintenanceRpcCall(supabase, "update_maintenance_record", …)`.
5. `src/lib/maintenance-record-rpc.ts` → `supabase.rpc("update_maintenance_record", { p })` → PostgREST.
6. DB `public.update_maintenance_record(jsonb)`: `UPDATE public.vehicles …` → **`UPDATE public.device …`**
   → **trigger fires → INSERT INTO public.device_vehicle_history → 42P01** → function aborts → rollback.

**Exact failure point:** the `UPDATE public.device` statement inside `update_maintenance_record`
(the device-level trigger).

### ADD
1. `IssueModal` → `handleSave()` → `create(values)` → `createIssue` → `createMaintenanceRecord`.
2. → `safeMaintenanceRpcCall(supabase, "create_maintenance_record", …)` → `supabase.rpc(...)`.
3. DB `public.create_maintenance_record(jsonb)`: `INSERT INTO public.vehicles …` →
   **`INSERT INTO public.device …`** → **trigger fires → INSERT INTO public.device_vehicle_history
   → 42P01** → rollback.

**Exact failure point:** the `INSERT INTO public.device` statement inside `create_maintenance_record`.

Both paths converge on a **device write**, which is why both ADD and EDIT fail identically.

---

## 4. Broken-dependency analysis

| Object | Status | Note |
|--------|--------|------|
| `public.device_vehicle_history` (table) | **MISSING** | referenced by a prod trigger/function |
| trigger on `public.device` (name unknown) | **present in prod, broken** | writes to the missing table; **not in repo** |
| its trigger function (e.g. `log_device_vehicle_history()`) | **present in prod, broken** | references the missing table; **not in repo** |
| `public.create_maintenance_record` / `update_maintenance_record` | present | repo versions do **not** reference `device_vehicle_history`; they fail only because the device write fires the external trigger |

The trigger is most likely on **`public.device`** (the name implies logging device↔vehicle
assignment, and `device` holds `vehicle_id`). It could alternatively be on `public.vehicles`
(the RPC updates `vehicles` immediately before `device`); §7 confirms definitively.

---

## 5. Application vs. real production schema (mismatches)

| Area | Finding |
|------|---------|
| Tables the app uses (7) | all present; columns match the repo. |
| `issues.vehicle_id` | still present in prod (redundant column; my drop **not** applied). |
| App-expected object missing | **none** — the app does not reference `device_vehicle_history`. |
| Prod object missing its dependency | **`device_vehicle_history`** referenced by a prod-only trigger/function (root cause). |
| Unexpected prod object | `public.issues_safe` **view exists in prod** (columns match my proposed view) — someone deployed Stage 1 of my migration (see §6). Harmless to this incident. |
| Stale generated types | N/A (no generated Supabase types in repo). |
| Broken FKs | none observed; all app embeds resolve. |

---

## 6. Regression check of my previous migration (explicitly verified)

- **`issues.vehicle_id` drop:** NOT applied to production — column still present (`GET issues?select=vehicle_id` → `200` with a value). No regression.
- **`issues_safe`:** the view **exists in production** with exactly my proposed columns
  (`issues` base columns + `vehicle_id` derived from `device`). It references `device`, **not**
  `device_vehicle_history`, so it is **not** the cause. ⚠️ It does indicate someone deployed **Stage 1
  of my migration to production out-of-band** (I only ever created it on the local mirror).
- **App code changes (explicit selects, SSD enum):** SELECT/enum only; cannot create a trigger.
- **Conclusion:** my migration did **not** introduce `device_vehicle_history` and is **not** the root
  cause. The broken trigger is unrelated production drift.

---

## 7. Read-only confirmation queries (need `service_role`/DB connection — anon cannot read catalog)

```sql
-- (a) Every trigger/function that references the missing table:
select tgrelid::regclass as on_table, tgname, pg_get_triggerdef(t.oid) as def
from pg_trigger t
where not t.tgisinternal
  and pg_get_triggerdef(t.oid) ilike '%device_vehicle_history%';

select p.oid::regprocedure as function, pg_get_functiondef(p.oid) as def
from pg_proc p
where pg_get_functiondef(p.oid) ilike '%device_vehicle_history%';

-- (b) ALL broken dependencies (functions referencing any non-existent relation) — catch others too:
--     review pg_get_functiondef for every function and confirm referenced relations exist.
select p.oid::regprocedure
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public';

-- (c) Confirm the table is truly absent:
select to_regclass('public.device_vehicle_history') as exists;   -- expect NULL
```

---

## 8. Exact fix (DO NOT IMPLEMENT — options; both are DB changes, not app changes)

Once §7(a) identifies the trigger + function, choose based on intent:

**Option A — the history feature IS wanted → create the missing table** (unblocks ADD/EDIT):
```sql
create table if not exists public.device_vehicle_history (
  id uuid primary key default gen_random_uuid(),
  device_id  uuid not null references public.device (id)   on delete cascade,
  vehicle_id uuid          references public.vehicles (id) on delete set null,
  changed_at timestamptz not null default now()
);
-- NOTE: the real column list MUST match what the trigger function inserts (from §7(a)).
```

**Option B — the trigger was a mistake / not wanted → remove the broken trigger + function:**
```sql
drop trigger if exists <trigger_name> on public.device;   -- name from §7(a)
drop function if exists public.<trigger_function>();       -- name from §7(a)
```

After either, `notify pgrst, 'reload schema';`. Apply in staging first, with a backup.

**Migration required:** yes — a production DB migration (Option A or B). It must be authored from the
trigger definition in §7(a) and, importantly, **added to the repo** so prod and code stop drifting.
No SQL was executed here.

---

## 9. Severity

**Critical** — all create/update of maintenance records is broken in production (writes abort). Read
paths (Issues list, Reports, exports) are unaffected. Root cause is a production-only broken trigger
dependency, independent of this repository and of my prior migration.

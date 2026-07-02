-- =============================================================================
-- Migration: remove redundant column public.issues.vehicle_id
-- =============================================================================
-- Source of truth for a vehicle is:  issues.device_id -> device.id -> device.vehicle_id
-- issues.vehicle_id is a duplicated FK (drifts; unused by the app).
--
-- SAFETY
--   * DO NOT run automatically. Review + BACKUP first; run in staging, then prod.
--   * Production was audited READ-ONLY; this file was TESTED on a local mirror.
--   * Blue-green: deploy STAGE 1 (non-destructive) first, validate, then STAGE 2 (drop).
--   * Full rollback provided (SECTION R).
--
-- NOTE on syntax: PostgreSQL has no `SELECT * EXCEPT(col)`; the compat view lists columns
--   explicitly and derives vehicle_id from device.
-- =============================================================================


-- =============================================================================
-- STAGE 1 — NON-DESTRUCTIVE (deploy first; zero downtime, fully reversible)
-- =============================================================================

-- 1A. PRE-CHECK (read-only) --------------------------------------------------
-- Column presence:
select exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'issues' and column_name = 'vehicle_id'
) as issues_vehicle_id_exists;

-- Population + drift snapshot:
select
  count(*)                                                   as total_issues,
  count(*) filter (where i.vehicle_id is not null)           as non_null_vehicle_id,
  count(*) filter (where i.vehicle_id is null)               as null_vehicle_id
from public.issues i;

-- Mismatches vs authoritative device.vehicle_id (IS DISTINCT FROM handles NULLs):
select i.id as issue_id, i.vehicle_id as issues_vehicle_id, d.vehicle_id as device_vehicle_id
from public.issues i
join public.device d on d.id = i.device_id
where i.vehicle_id is distinct from d.vehicle_id
  and i.vehicle_id is not null;   -- NULLs are expected (app-created rows) and are not "wrong"


-- 1B. DATA FIX (idempotent) --------------------------------------------------
-- Reconcile the redundant column to the authoritative value so the two agree while both
-- exist (protects any external reader during the transition). Safe to re-run.
begin;
  update public.issues i
  set vehicle_id = d.vehicle_id
  from public.device d
  where d.id = i.device_id
    and i.vehicle_id is distinct from d.vehicle_id;
commit;

-- Re-verify: expect 0 rows.
select count(*) as remaining_mismatches
from public.issues i
join public.device d on d.id = i.device_id
where i.vehicle_id is distinct from d.vehicle_id
  and i.vehicle_id is not null;


-- 1C. BACKWARD-COMPATIBILITY VIEW -------------------------------------------
-- issues_safe always exposes a correct vehicle_id derived from device, so any external
-- consumer (BI, scripts) can migrate to it BEFORE the column is dropped and keep working after.
-- LEFT JOIN so no issue row is ever dropped from the view.
create or replace view public.issues_safe as
select
  i.id,
  i.device_id,
  i.issue_type,
  i.motherboard_issue,
  i.pmm_issue,
  i.ssd_issue,
  i.other_issue,
  i.description,
  i.issue_source,
  i.created_at,
  d.vehicle_id as vehicle_id
from public.issues i
left join public.device d on d.id = i.device_id;

grant select on public.issues_safe to anon, authenticated;

-- Reload PostgREST schema cache so the view is exposed via the API.
notify pgrst, 'reload schema';

-- >>> DEPLOY APP + validate production here (Issues page, Reports, CSV/XLSX, filters, KPIs). <<<
-- The application in this repo already reads vehicle only via device.vehicle_id and selects
-- explicit issues columns (no issues.vehicle_id), so it is safe both before and after STAGE 2.


-- =============================================================================
-- STAGE 2 — DESTRUCTIVE (run ONLY after STAGE 1 is validated in production)
-- =============================================================================
-- begin;
--   alter table public.issues drop column if exists vehicle_id;
-- commit;
-- notify pgrst, 'reload schema';


-- =============================================================================
-- SECTION R — ROLLBACK (restore column + recover data from authoritative source)
-- =============================================================================
-- Data is fully recoverable because device.vehicle_id is authoritative.
-- begin;
--   alter table public.issues
--     add column if not exists vehicle_id uuid references public.vehicles (id) on delete cascade;
--
--   update public.issues i
--   set vehicle_id = d.vehicle_id
--   from public.device d
--   where d.id = i.device_id;
--
--   -- Optional: match the prior index/state if one existed.
--   -- create index if not exists issues_vehicle_id_idx on public.issues (vehicle_id);
-- commit;
-- notify pgrst, 'reload schema';
--
-- If the compat view is no longer needed after full rollout/rollback:
--   drop view if exists public.issues_safe;
--   notify pgrst, 'reload schema';

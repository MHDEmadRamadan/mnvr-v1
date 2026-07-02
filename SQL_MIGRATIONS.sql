-- =============================================================================
-- SQL_MIGRATIONS.sql  —  PROPOSED migrations for the MNVR maintenance database
-- =============================================================================
-- SAFETY:
--   * DO NOT run automatically. Review, back up, and test in staging first.
--   * Production was inspected READ-ONLY; none of this was executed on production.
--   * Section A is a safe/idempotent realignment (no-op if already aligned).
--   * Section B is DESTRUCTIVE and is intentionally left commented out.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION A — Align the "SSD" enum to NEW / USED / No
-- -----------------------------------------------------------------------------
-- Production is ALREADY ('NEW','USED','No'); this section is only needed for a
-- database created from the OLD schema file (labels 'NEW SSD','USED SSD','No').
-- It is safe to run repeatedly: it does nothing when the enum already matches.
-- Wrap in a transaction; converts the column to text, rebuilds the enum, and
-- maps any legacy labels to the canonical ones.

do $$
declare
  has_legacy boolean;
begin
  select exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'SSD' and e.enumlabel in ('NEW SSD', 'USED SSD')
  ) into has_legacy;

  if has_legacy then
    raise notice 'Realigning "SSD" enum from legacy labels to (NEW, USED, No)';

    alter table public.replacements alter column ssd drop default;
    alter table public.replacements alter column ssd type text using ssd::text;

    drop type public."SSD";
    create type public."SSD" as enum ('NEW', 'USED', 'No');

    update public.replacements
      set ssd = case
        when ssd = 'NEW SSD'  then 'NEW'
        when ssd = 'USED SSD' then 'USED'
        when ssd in ('NEW', 'USED', 'No') then ssd
        else 'No'
      end;

    alter table public.replacements
      alter column ssd type public."SSD" using ssd::public."SSD";
    alter table public.replacements
      alter column ssd set default 'No'::public."SSD";
  else
    raise notice '"SSD" enum already aligned (NEW, USED, No) — no action taken';
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- SECTION B — Normalize: drop redundant issues.vehicle_id  (DESTRUCTIVE)
-- -----------------------------------------------------------------------------
-- ►► The full, staged, blue-green version of this change (pre-check + data fix +
--    issues_safe compat view + drop + rollback) now lives in:
--      supabase/schema/migrations/20260701_drop_issues_vehicle_id.sql
--    It was tested end-to-end on a local mirror (see VEHICLE_ID_REMOVAL.md).
--    The condensed form below is kept for reference.
--
-- Redundant with issues.device_id -> device.vehicle_id, unused by the app, and
-- drifting (app-created rows are NULL). REVIEW + BACKUP before enabling.
--
-- Step 1 (read-only) — inspect the redundant column vs the authoritative device link:
--
--   select count(*) as mismatches
--   from public.issues i
--   join public.device d on d.id = i.device_id
--   where i.vehicle_id is not null
--     and i.vehicle_id <> d.vehicle_id;
--
-- NOTE: as of this audit, production returns mismatches = 2 (issues
--   978a09c2-6561-4dcf-9e1c-0b0bb5887351 and 7ef0307b-d9c9-4c11-92ad-474698c7eaa4).
--   The application reads the vehicle only via issues.device_id -> device.vehicle_id, so
--   device.vehicle_id is authoritative and dropping issues.vehicle_id LOSES NO CORRECT DATA —
--   it removes the stale duplicate. The mismatches are evidence FOR removal, not a blocker.
--
-- Step 2 — after a backup + review, run:
--
-- begin;
--   alter table public.issues drop column if exists vehicle_id;
-- commit;
--
-- (Leave commented. Enabling this is a deliberate, reviewed operator action.)


-- -----------------------------------------------------------------------------
-- SECTION C — Security hardening: restrict anon writes  (REVIEW — needs product decision)
-- -----------------------------------------------------------------------------
-- The anon key is public (shipped to the browser). Today RLS grants anon full
-- INSERT/UPDATE/DELETE plus EXECUTE on the maintenance RPCs, i.e. anyone can modify all data.
-- If/when writes are moved server-side (service_role) or auth is added, lock anon to read-only:
--
-- begin;
--   drop policy if exists "issues_insert_anon" on public.issues;
--   drop policy if exists "issues_update_anon" on public.issues;
--   drop policy if exists "issues_delete_anon" on public.issues;
--   -- ...and the *_insert_anon / *_update_anon policies on device, vehicles,
--   --    device_status, hardware, storage, replacements (see issues.sql).
--   revoke execute on function public.create_maintenance_record(jsonb)  from anon;
--   revoke execute on function public.update_maintenance_record(jsonb)  from anon;
--   revoke execute on function public.delete_maintenance_records(uuid[]) from anon;
-- commit;
--
-- Do NOT apply until the app's write path no longer uses the anon key, or all writes will break.
-- (Leave commented.)

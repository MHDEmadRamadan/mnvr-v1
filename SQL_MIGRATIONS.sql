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
-- Redundant with issues.device_id -> device.vehicle_id, unused by the app, and
-- drifting (app-created rows are NULL). REVIEW + BACKUP before enabling.
--
-- Step 1 (read-only) — verify redundancy; expect mismatches = 0 before dropping:
--
--   select count(*) as mismatches
--   from public.issues i
--   join public.device d on d.id = i.device_id
--   where i.vehicle_id is not null
--     and i.vehicle_id <> d.vehicle_id;
--
-- Step 2 — only if mismatches = 0 and after a backup, run:
--
-- begin;
--   alter table public.issues drop column if exists vehicle_id;
-- commit;
--
-- (Leave commented. Enabling this is a deliberate, reviewed operator action.)

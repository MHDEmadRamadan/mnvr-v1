-- =============================================================================
-- Migration: remove redundant column public.issues.vehicle_id  (schema-drift fix)
-- =============================================================================
-- Authoritative vehicle for an issue is:  issues.device_id -> device.id -> device.vehicle_id
-- public.issues.vehicle_id is a duplicated FK that exists in production but not in the
-- repository schema, and NOTHING depends on it:
--   * App reads vehicle only via the device embed (device:device_id -> vehicle:vehicle_id).
--   * No SQL function reads or writes issues.vehicle_id
--     (create_/update_/delete_maintenance_record all use device.vehicle_id / vehicles.id).
--   * View public.issues_safe derives vehicle_id from device (LEFT JOIN device), not issues.
--   * Only dependent object is FK fk_vehicle_issues, which is dropped together with the column.
--
-- Idempotent + safe to re-run. Verified on a local mirror of the pulled production schema.
-- =============================================================================

begin;
-- 1) Reconcile the redundant column to the authoritative value while it still exists
--    (protects any external reader during the transition). No-op once the column is gone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'issues' and column_name = 'vehicle_id'
  ) then
    update public.issues i
    set vehicle_id = d.vehicle_id
    from public.device d
    where d.id = i.device_id
      and i.vehicle_id is distinct from d.vehicle_id;
  end if;
end $$;
-- 2) Backward-compatible view: always exposes a correct vehicle_id derived from device,
--    so any external consumer keeps working before and after the column is dropped.
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
-- 3) Drop the redundant column (idempotent). The dependent FK fk_vehicle_issues is
--    removed automatically with the column.
alter table public.issues drop column if exists vehicle_id;
commit;
-- Reload PostgREST schema cache so the API reflects the change.
notify pgrst, 'reload schema';
-- =============================================================================
-- ROLLBACK (data fully recoverable from authoritative device.vehicle_id)
-- =============================================================================
-- begin;
--   alter table public.issues
--     add column if not exists vehicle_id uuid references public.vehicles (id);
--   update public.issues i
--   set vehicle_id = d.vehicle_id
--   from public.device d
--   where d.id = i.device_id;
-- commit;
-- notify pgrst, 'reload schema';;

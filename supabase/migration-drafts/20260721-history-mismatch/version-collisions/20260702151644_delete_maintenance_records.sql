-- Cascade delete maintenance records: issues → orphan device cleanup → orphan vehicle cleanup.
-- device child tables (device_status, hardware, storage, replacements, issues) already ON DELETE CASCADE.

create or replace function public.delete_maintenance_records(p_issue_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_issues integer;
  v_deleted_devices integer := 0;
  v_deleted_vehicles integer := 0;
  r record;
begin
  if p_issue_ids is null or cardinality(p_issue_ids) = 0 then
    return jsonb_build_object(
      'deleted_issues', 0,
      'deleted_devices', 0,
      'deleted_vehicles', 0
    );
  end if;

  create temp table _maint_del_targets on commit drop as
    select distinct i.device_id, d.vehicle_id
    from public.issues i
    inner join public.device d on d.id = i.device_id
    where i.id = any (p_issue_ids);

  delete from public.issues
  where id = any (p_issue_ids);

  get diagnostics v_deleted_issues = row_count;

  for r in select device_id from _maint_del_targets loop
    if not exists (select 1 from public.issues where device_id = r.device_id) then
      delete from public.device where id = r.device_id;
      v_deleted_devices := v_deleted_devices + 1;
    end if;
  end loop;

  for r in select distinct vehicle_id from _maint_del_targets loop
    if not exists (select 1 from public.device where vehicle_id = r.vehicle_id) then
      delete from public.vehicles where id = r.vehicle_id;
      v_deleted_vehicles := v_deleted_vehicles + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'deleted_issues', v_deleted_issues,
    'deleted_devices', v_deleted_devices,
    'deleted_vehicles', v_deleted_vehicles
  );
end;
$$;

grant execute on function public.delete_maintenance_records(uuid[]) to anon, authenticated;

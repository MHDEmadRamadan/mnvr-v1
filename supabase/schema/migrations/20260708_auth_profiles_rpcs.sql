-- create_maintenance_record (production version + auth.uid / created_by / status)
create or replace function public.create_maintenance_record(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_vehicle_number text;
  v_imei text;
  v_vehicle_id uuid;
  v_device_id uuid;
  v_reuse_device boolean := false;
  v_device_status_id uuid;
  v_hardware_id uuid;
  v_storage_id uuid;
  v_replacements_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'AUTH:Authentication required' using errcode = 'P0001';
  end if;

  v_vehicle_number := nullif(btrim(coalesce(p->>'vehicle_number', '')), '');
  v_imei := nullif(btrim(coalesce(p->>'imei', '')), '');

  if v_vehicle_number is null then
    raise exception 'VALIDATION:Vehicle number is required' using errcode = 'P0001';
  end if;
  if v_imei is null then
    raise exception 'VALIDATION:Device IMEI is required' using errcode = 'P0001';
  end if;

  insert into public.vehicles (vehicle_number, description)
  values (v_vehicle_number, coalesce(p->>'vehicle_description', ''))
  on conflict (vehicle_number) do update
    set description = coalesce(excluded.description, public.vehicles.description)
  returning id into v_vehicle_id;

  select d.id into v_device_id
  from public.device d
  where btrim(d.imei) = v_imei;

  if v_device_id is not null then
    v_reuse_device := true;
    perform public.record_device_vehicle_assignment(v_device_id, v_vehicle_id);
  end if;

  if v_reuse_device then
    update public.device
    set
      vehicle_id = v_vehicle_id,
      description = coalesce(p->>'device_description', ''),
      tickets = nullif(btrim(coalesce(p->>'device_tickets', '')), '')
    where id = v_device_id;

    select id into v_device_status_id from public.device_status where device_id = v_device_id order by created_at desc limit 1;
    if v_device_status_id is not null then
      update public.device_status set
        software_version = coalesce(p->>'software_version', ''),
        flespi_status = coalesce(p->>'flespi_status', ''),
        screen_status = coalesce(p->>'screen_status', ''),
        dotmatrix_status = coalesce(p->>'dotmatrix_status', ''),
        ssh_status = coalesce((p->>'ssh_status')::boolean, false),
        pmm_software = nullif(p->>'pmm_software', '')::double precision,
        description = coalesce(p->>'device_status_description', '')
      where id = v_device_status_id;
    else
      insert into public.device_status (device_id, software_version, flespi_status, screen_status, dotmatrix_status, ssh_status, pmm_software, description)
      values (v_device_id, coalesce(p->>'software_version', ''), coalesce(p->>'flespi_status', ''), coalesce(p->>'screen_status', ''), coalesce(p->>'dotmatrix_status', ''), coalesce((p->>'ssh_status')::boolean, false), nullif(p->>'pmm_software', '')::double precision, coalesce(p->>'device_status_description', ''));
    end if;

    select id into v_hardware_id from public.hardware where device_id = v_device_id order by created_at desc limit 1;
    if v_hardware_id is not null then
      update public.hardware set motherboard_type = coalesce(p->>'motherboard_type', ''), pmm_type = coalesce(p->>'pmm_type', ''), description = coalesce(p->>'hardware_description', '') where id = v_hardware_id;
    else
      insert into public.hardware (device_id, motherboard_type, pmm_type, description) values (v_device_id, coalesce(p->>'motherboard_type', ''), coalesce(p->>'pmm_type', ''), coalesce(p->>'hardware_description', ''));
    end if;

    select id into v_storage_id from public.storage where device_id = v_device_id order by created_at desc limit 1;
    if v_storage_id is not null then
      update public.storage set ssd_type = coalesce(p->>'ssd_type', ''), disk_health = coalesce((p->>'disk_health')::boolean, false), power_on_hours = coalesce((p->>'power_on_hours')::integer, 0), power_cycles = coalesce((p->>'power_cycles')::integer, 0), power_off = coalesce((p->>'power_off')::integer, 0), lifetime = coalesce((p->>'lifetime')::integer, 0), summary_ssd = coalesce(p->>'summary_ssd', ''), description = coalesce(p->>'storage_description', '') where id = v_storage_id;
    else
      insert into public.storage (device_id, ssd_type, disk_health, power_on_hours, power_cycles, power_off, lifetime, summary_ssd, description) values (v_device_id, coalesce(p->>'ssd_type', ''), coalesce((p->>'disk_health')::boolean, false), coalesce((p->>'power_on_hours')::integer, 0), coalesce((p->>'power_cycles')::integer, 0), coalesce((p->>'power_off')::integer, 0), coalesce((p->>'lifetime')::integer, 0), coalesce(p->>'summary_ssd', ''), coalesce(p->>'storage_description', ''));
    end if;

    select id into v_replacements_id from public.replacements where device_id = v_device_id order by created_at desc limit 1;
    if v_replacements_id is not null then
      update public.replacements set ssd = coalesce(nullif(btrim(p->>'ssd'), ''), 'No')::public."SSD", motherboard = coalesce(nullif(btrim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD", sata_cable = coalesce(nullif(btrim(p->>'sata_cable'), ''), 'No')::public.sata_cable, imei_changed = coalesce(nullif(btrim(p->>'imei_changed'), ''), 'false'), sim_changed = coalesce(nullif(btrim(p->>'sim_changed'), ''), 'false'), device_changed = coalesce((p->>'device_changed')::boolean, false), description = coalesce(p->>'replacements_description', '') where id = v_replacements_id;
    else
      insert into public.replacements (device_id, ssd, motherboard, sata_cable, imei_changed, sim_changed, device_changed, description) values (v_device_id, coalesce(nullif(btrim(p->>'ssd'), ''), 'No')::public."SSD", coalesce(nullif(btrim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD", coalesce(nullif(btrim(p->>'sata_cable'), ''), 'No')::public.sata_cable, coalesce(nullif(btrim(p->>'imei_changed'), ''), 'false'), coalesce(nullif(btrim(p->>'sim_changed'), ''), 'false'), coalesce((p->>'device_changed')::boolean, false), coalesce(p->>'replacements_description', ''));
    end if;
  else
    insert into public.device (vehicle_id, imei, description, tickets)
    values (v_vehicle_id, v_imei, coalesce(p->>'device_description', ''), nullif(btrim(coalesce(p->>'device_tickets', '')), ''))
    returning id into v_device_id;

    perform public.record_device_vehicle_assignment(v_device_id, v_vehicle_id);

    insert into public.device_status (device_id, software_version, flespi_status, screen_status, dotmatrix_status, ssh_status, pmm_software, description)
    values (v_device_id, coalesce(p->>'software_version', ''), coalesce(p->>'flespi_status', ''), coalesce(p->>'screen_status', ''), coalesce(p->>'dotmatrix_status', ''), coalesce((p->>'ssh_status')::boolean, false), nullif(p->>'pmm_software', '')::double precision, coalesce(p->>'device_status_description', ''));

    insert into public.hardware (device_id, motherboard_type, pmm_type, description)
    values (v_device_id, coalesce(p->>'motherboard_type', ''), coalesce(p->>'pmm_type', ''), coalesce(p->>'hardware_description', ''));

    insert into public.storage (device_id, ssd_type, disk_health, power_on_hours, power_cycles, power_off, lifetime, summary_ssd, description)
    values (v_device_id, coalesce(p->>'ssd_type', ''), coalesce((p->>'disk_health')::boolean, false), coalesce((p->>'power_on_hours')::integer, 0), coalesce((p->>'power_cycles')::integer, 0), coalesce((p->>'power_off')::integer, 0), coalesce((p->>'lifetime')::integer, 0), coalesce(p->>'summary_ssd', ''), coalesce(p->>'storage_description', ''));

    insert into public.replacements (device_id, ssd, motherboard, sata_cable, imei_changed, sim_changed, device_changed, description)
    values (v_device_id, coalesce(nullif(btrim(p->>'ssd'), ''), 'No')::public."SSD", coalesce(nullif(btrim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD", coalesce(nullif(btrim(p->>'sata_cable'), ''), 'No')::public.sata_cable, coalesce(nullif(btrim(p->>'imei_changed'), ''), 'false'), coalesce(nullif(btrim(p->>'sim_changed'), ''), 'false'), coalesce((p->>'device_changed')::boolean, false), coalesce(p->>'replacements_description', ''));
  end if;

  insert into public.issues (
    device_id, issue_type, motherboard_issue, pmm_issue, ssd_issue,
    other_issue, description, issue_source,
    created_by, status
  )
  values (
    v_device_id,
    coalesce(p->>'issue_type', ''),
    coalesce(p->>'motherboard_issue', ''),
    coalesce(p->>'pmm_issue', ''),
    coalesce(p->>'ssd_issue', ''),
    coalesce(p->>'other_issue', ''),
    coalesce(p->>'issue_description', ''),
    coalesce(p->>'issue_source', ''),
    v_user_id,
    coalesce(nullif(btrim(p->>'status'), ''), 'open')::public.issue_status
  );

  return jsonb_build_object(
    'device_id', v_device_id,
    'issues', (
      select coalesce(jsonb_agg(row_to_json(i)::jsonb order by i.created_at desc), '[]'::jsonb)
      from public.issues i
      where i.device_id = v_device_id
    )
  );
end;
$$;

-- update_maintenance_record (production version + auth.uid / status / resolved_*)
create or replace function public.update_maintenance_record(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_issue_id uuid;
  v_current_device_id uuid;
  v_current_vehicle_id uuid;
  v_new_vehicle_number text;
  v_new_imei text;
  v_target_vehicle_id uuid;
  v_target_device_id uuid;
  v_existing_device_id uuid;
  v_current_imei text;
  v_device_changed boolean;
  v_device_status_id uuid;
  v_hardware_id uuid;
  v_storage_id uuid;
  v_replacements_id uuid;
  v_old_status public.issue_status;
  v_new_status public.issue_status;
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'AUTH:Authentication required' using errcode = 'P0001';
  end if;

  v_issue_id := (p->>'issue_id')::uuid;
  v_current_device_id := (p->>'device_id')::uuid;
  v_current_vehicle_id := (p->>'vehicle_id')::uuid;

  select i.status into v_old_status
  from public.issues i
  where i.id = v_issue_id;

  v_new_status := coalesce(
    nullif(btrim(coalesce(p->>'status', '')), ''),
    v_old_status::text,
    'open'
  )::public.issue_status;

  v_new_vehicle_number := nullif(btrim(coalesce(p->>'vehicle_number', '')), '');
  v_new_imei := nullif(btrim(coalesce(p->>'imei', '')), '');

  if v_new_vehicle_number is null then
    raise exception 'VALIDATION:Vehicle number is required' using errcode = 'P0001';
  end if;
  if v_new_imei is null then
    raise exception 'VALIDATION:Device IMEI is required' using errcode = 'P0001';
  end if;

  select id into v_target_vehicle_id
  from public.vehicles
  where btrim(vehicle_number) = v_new_vehicle_number
  limit 1;

  if v_target_vehicle_id is null then
    update public.vehicles set vehicle_number = v_new_vehicle_number, description = coalesce(p->>'vehicle_description', '') where id = v_current_vehicle_id;
    v_target_vehicle_id := v_current_vehicle_id;
  else
    update public.vehicles set description = coalesce(p->>'vehicle_description', '') where id = v_target_vehicle_id;
  end if;

  select btrim(imei) into v_current_imei from public.device where id = v_current_device_id;

  select d.id into v_existing_device_id
  from public.device d where btrim(d.imei) = v_new_imei;

  if v_existing_device_id is not null then
    v_target_device_id := v_existing_device_id;
  elsif v_new_imei is distinct from v_current_imei then
    insert into public.device (vehicle_id, imei, description, tickets)
    values (v_target_vehicle_id, v_new_imei, coalesce(p->>'device_description', ''), nullif(btrim(coalesce(p->>'device_tickets', '')), ''))
    returning id into v_target_device_id;
    perform public.record_device_vehicle_assignment(v_target_device_id, v_target_vehicle_id);
  else
    v_target_device_id := v_current_device_id;
  end if;

  v_device_changed := (v_target_device_id is distinct from v_current_device_id);

  perform public.record_device_vehicle_assignment(v_target_device_id, v_target_vehicle_id);

  update public.device
  set
    vehicle_id = v_target_vehicle_id,
    imei = v_new_imei,
    description = coalesce(p->>'device_description', ''),
    tickets = nullif(btrim(coalesce(p->>'device_tickets', '')), '')
  where id = v_target_device_id;

  if v_device_changed then
    select id into v_device_status_id from public.device_status where device_id = v_target_device_id order by created_at desc limit 1;
    select id into v_hardware_id from public.hardware where device_id = v_target_device_id order by created_at desc limit 1;
    select id into v_storage_id from public.storage where device_id = v_target_device_id order by created_at desc limit 1;
    select id into v_replacements_id from public.replacements where device_id = v_target_device_id order by created_at desc limit 1;
  else
    v_device_status_id := nullif(p->>'device_status_id', '')::uuid;
    v_hardware_id := nullif(p->>'hardware_id', '')::uuid;
    v_storage_id := nullif(p->>'storage_id', '')::uuid;
    v_replacements_id := nullif(p->>'replacements_id', '')::uuid;
  end if;

  if v_device_status_id is not null then
    update public.device_status set software_version = coalesce(p->>'software_version', ''), flespi_status = coalesce(p->>'flespi_status', ''), screen_status = coalesce(p->>'screen_status', ''), dotmatrix_status = coalesce(p->>'dotmatrix_status', ''), ssh_status = coalesce((p->>'ssh_status')::boolean, false), pmm_software = nullif(p->>'pmm_software', '')::double precision, description = coalesce(p->>'device_status_description', '') where id = v_device_status_id and device_id = v_target_device_id;
  else
    insert into public.device_status (device_id, software_version, flespi_status, screen_status, dotmatrix_status, ssh_status, pmm_software, description) values (v_target_device_id, coalesce(p->>'software_version', ''), coalesce(p->>'flespi_status', ''), coalesce(p->>'screen_status', ''), coalesce(p->>'dotmatrix_status', ''), coalesce((p->>'ssh_status')::boolean, false), nullif(p->>'pmm_software', '')::double precision, coalesce(p->>'device_status_description', ''));
  end if;

  if v_hardware_id is not null then
    update public.hardware set motherboard_type = coalesce(p->>'motherboard_type', ''), pmm_type = coalesce(p->>'pmm_type', ''), description = coalesce(p->>'hardware_description', '') where id = v_hardware_id and device_id = v_target_device_id;
  else
    insert into public.hardware (device_id, motherboard_type, pmm_type, description) values (v_target_device_id, coalesce(p->>'motherboard_type', ''), coalesce(p->>'pmm_type', ''), coalesce(p->>'hardware_description', ''));
  end if;

  if v_storage_id is not null then
    update public.storage set ssd_type = coalesce(p->>'ssd_type', ''), disk_health = coalesce((p->>'disk_health')::boolean, false), power_on_hours = coalesce((p->>'power_on_hours')::integer, 0), power_cycles = coalesce((p->>'power_cycles')::integer, 0), power_off = coalesce((p->>'power_off')::integer, 0), lifetime = coalesce((p->>'lifetime')::integer, 0), summary_ssd = coalesce(p->>'summary_ssd', ''), description = coalesce(p->>'storage_description', '') where id = v_storage_id and device_id = v_target_device_id;
  else
    insert into public.storage (device_id, ssd_type, disk_health, power_on_hours, power_cycles, power_off, lifetime, summary_ssd, description) values (v_target_device_id, coalesce(p->>'ssd_type', ''), coalesce((p->>'disk_health')::boolean, false), coalesce((p->>'power_on_hours')::integer, 0), coalesce((p->>'power_cycles')::integer, 0), coalesce((p->>'power_off')::integer, 0), coalesce((p->>'lifetime')::integer, 0), coalesce(p->>'summary_ssd', ''), coalesce(p->>'storage_description', ''));
  end if;

  if v_replacements_id is not null then
    update public.replacements set ssd = coalesce(nullif(btrim(p->>'ssd'), ''), 'No')::public."SSD", motherboard = coalesce(nullif(btrim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD", sata_cable = coalesce(nullif(btrim(p->>'sata_cable'), ''), 'No')::public.sata_cable, imei_changed = coalesce(nullif(btrim(p->>'imei_changed'), ''), 'false'), sim_changed = coalesce(nullif(btrim(p->>'sim_changed'), ''), 'false'), device_changed = coalesce((p->>'device_changed')::boolean, false), description = coalesce(p->>'replacements_description', '') where id = v_replacements_id and device_id = v_target_device_id;
  else
    insert into public.replacements (device_id, ssd, motherboard, sata_cable, imei_changed, sim_changed, device_changed, description) values (v_target_device_id, coalesce(nullif(btrim(p->>'ssd'), ''), 'No')::public."SSD", coalesce(nullif(btrim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD", coalesce(nullif(btrim(p->>'sata_cable'), ''), 'No')::public.sata_cable, coalesce(nullif(btrim(p->>'imei_changed'), ''), 'false'), coalesce(nullif(btrim(p->>'sim_changed'), ''), 'false'), coalesce((p->>'device_changed')::boolean, false), coalesce(p->>'replacements_description', ''));
  end if;

  update public.issues
  set
    device_id = v_target_device_id,
    issue_type = coalesce(p->>'issue_type', ''),
    motherboard_issue = coalesce(p->>'motherboard_issue', ''),
    pmm_issue = coalesce(p->>'pmm_issue', ''),
    ssd_issue = coalesce(p->>'ssd_issue', ''),
    other_issue = coalesce(p->>'other_issue', ''),
    description = coalesce(p->>'issue_description', ''),
    issue_source = coalesce(p->>'issue_source', ''),
    status = v_new_status,
    resolved_by = case
      when v_new_status = 'resolved'::public.issue_status
        and v_old_status is distinct from 'resolved'::public.issue_status
      then v_user_id
      else resolved_by
    end,
    resolved_at = case
      when v_new_status = 'resolved'::public.issue_status
        and v_old_status is distinct from 'resolved'::public.issue_status
      then now()
      else resolved_at
    end
  where id = v_issue_id;

  return jsonb_build_object(
    'device_id', v_target_device_id,
    'issues', (
      select coalesce(jsonb_agg(row_to_json(i)::jsonb order by i.created_at desc), '[]'::jsonb)
      from public.issues i
      where i.device_id = v_target_device_id
    )
  );
end;
$$;

-- delete_maintenance_records â€” admin gate added (SECURITY DEFINER bypasses RLS)
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
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'AUTH:Authentication required' using errcode = 'P0001';
  end if;

  if not public.is_admin() then
    raise exception 'FORBIDDEN:Admin role required' using errcode = 'P0001';
  end if;

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

-- ---------------------------------------------------------------------------
-- 10. Grants â€” authenticated only (revoke anon)
-- ---------------------------------------------------------------------------
revoke execute on function public.create_maintenance_record(jsonb) from anon;
revoke execute on function public.update_maintenance_record(jsonb) from anon;
revoke execute on function public.delete_maintenance_records(uuid[]) from anon;
revoke execute on function public.record_device_vehicle_assignment(uuid, uuid) from anon;

grant execute on function public.create_maintenance_record(jsonb) to authenticated;
grant execute on function public.update_maintenance_record(jsonb) to authenticated;
grant execute on function public.delete_maintenance_records(uuid[]) to authenticated;
grant execute on function public.record_device_vehicle_assignment(uuid, uuid) to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;

commit;

notify pgrst, 'reload schema';

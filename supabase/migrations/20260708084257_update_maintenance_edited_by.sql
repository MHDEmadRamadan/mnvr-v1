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
begin
  v_user_id := auth.uid();
  if v_user_id is null or not public.is_active_user() then
    raise exception 'AUTH:Authentication required' using errcode = 'P0001';
  end if;

  v_issue_id := (p->>'issue_id')::uuid;
  v_current_device_id := (p->>'device_id')::uuid;
  v_current_vehicle_id := (p->>'vehicle_id')::uuid;

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

  -- Reuse resolved_by as Edited by; set edited_at on every edit. No resolution workflow.
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
    resolved_by = v_user_id,
    edited_at = now()
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

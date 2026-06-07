-- Align maintenance RPC functions with current replacements schema:
--   ssd / motherboard / sata_cable ENUM columns (not new_* booleans)
--   imei_changed / sim_changed text value fields (not boolean)
-- Safe to re-run. After applying: NOTIFY pgrst, 'reload schema';

begin;

-- ---------------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------------
do $$
begin
  create type public."SSD" as enum ('NEW SSD', 'USED SSD', 'No');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."MOTHERBOARD" as enum ('NEW', 'USED', 'No');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.sata_cable as enum ('NEW', 'USED', 'No');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- replacements column alignment (skip if already migrated)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'replacements' and column_name = 'new_ssd'
  ) then
    alter table public.replacements add column if not exists ssd public."SSD" not null default 'No';
    alter table public.replacements add column if not exists motherboard public."MOTHERBOARD" not null default 'No';
    alter table public.replacements add column if not exists sata_cable public.sata_cable not null default 'No';

    update public.replacements set
      ssd = case when new_ssd then 'NEW SSD'::public."SSD" else 'No'::public."SSD" end,
      motherboard = case when new_motherboard then 'NEW'::public."MOTHERBOARD" else 'No'::public."MOTHERBOARD" end,
      sata_cable = case when new_sata_cable then 'NEW'::public.sata_cable else 'No'::public.sata_cable end;

    alter table public.replacements drop column if exists new_ssd;
    alter table public.replacements drop column if exists new_motherboard;
    alter table public.replacements drop column if exists new_sata_cable;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'replacements'
      and column_name = 'imei_changed' and udt_name = 'bool'
  ) then
    alter table public.replacements
      alter column imei_changed type text using case when imei_changed then 'true' else 'false' end,
      alter column imei_changed set default 'false';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'replacements'
      and column_name = 'sim_changed' and udt_name = 'bool'
  ) then
    alter table public.replacements
      alter column sim_changed type text using case when sim_changed then 'true' else 'false' end,
      alter column sim_changed set default 'false';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- create_maintenance_record
-- ---------------------------------------------------------------------------
create or replace function public.create_maintenance_record(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vehicle_id uuid;
  v_device_id uuid;
begin
  insert into public.vehicles (vehicle_number, description)
  values (
    coalesce(p->>'vehicle_number', ''),
    coalesce(p->>'vehicle_description', '')
  )
  returning id into v_vehicle_id;

  insert into public.device (vehicle_id, imei, description, tickets)
  values (
    v_vehicle_id,
    coalesce(p->>'imei', ''),
    coalesce(p->>'device_description', ''),
    nullif(trim(coalesce(p->>'device_tickets', '')), '')
  )
  returning id into v_device_id;

  insert into public.device_status (
    device_id, software_version, flespi_status, screen_status, dotmatrix_status,
    ssh_status, pmm_software, description
  )
  values (
    v_device_id,
    coalesce(p->>'software_version', ''),
    coalesce(p->>'flespi_status', ''),
    coalesce(p->>'screen_status', ''),
    coalesce(p->>'dotmatrix_status', ''),
    coalesce((p->>'ssh_status')::boolean, false),
    nullif(p->>'pmm_software', '')::double precision,
    coalesce(p->>'device_status_description', '')
  );

  insert into public.hardware (device_id, motherboard_type, pmm_type, description)
  values (
    v_device_id,
    coalesce(p->>'motherboard_type', ''),
    coalesce(p->>'pmm_type', ''),
    coalesce(p->>'hardware_description', '')
  );

  insert into public.storage (
    device_id, ssd_type, disk_health, power_on_hours, power_cycles,
    power_off, lifetime, summary_ssd, description
  )
  values (
    v_device_id,
    coalesce(p->>'ssd_type', ''),
    coalesce((p->>'disk_health')::boolean, false),
    coalesce((p->>'power_on_hours')::integer, 0),
    coalesce((p->>'power_cycles')::integer, 0),
    coalesce((p->>'power_off')::integer, 0),
    coalesce((p->>'lifetime')::integer, 0),
    coalesce(p->>'summary_ssd', ''),
    coalesce(p->>'storage_description', '')
  );

  insert into public.replacements (
    device_id, ssd, motherboard, sata_cable,
    imei_changed, sim_changed, device_changed, description
  )
  values (
    v_device_id,
    coalesce(nullif(trim(p->>'ssd'), ''), 'No')::public."SSD",
    coalesce(nullif(trim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD",
    coalesce(nullif(trim(p->>'sata_cable'), ''), 'No')::public.sata_cable,
    coalesce(nullif(trim(p->>'imei_changed'), ''), 'false'),
    coalesce(nullif(trim(p->>'sim_changed'), ''), 'false'),
    coalesce((p->>'device_changed')::boolean, false),
    coalesce(p->>'replacements_description', '')
  );

  insert into public.issues (
    device_id, issue_type, motherboard_issue, pmm_issue, ssd_issue,
    other_issue, description, issue_source
  )
  values (
    v_device_id,
    coalesce(p->>'issue_type', ''),
    coalesce(p->>'motherboard_issue', ''),
    coalesce(p->>'pmm_issue', ''),
    coalesce(p->>'ssd_issue', ''),
    coalesce(p->>'other_issue', ''),
    coalesce(p->>'issue_description', ''),
    coalesce(p->>'issue_source', '')
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

-- ---------------------------------------------------------------------------
-- update_maintenance_record
-- ---------------------------------------------------------------------------
create or replace function public.update_maintenance_record(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue_id uuid;
  v_device_id uuid;
  v_vehicle_id uuid;
  v_device_status_id uuid;
  v_hardware_id uuid;
  v_storage_id uuid;
  v_replacements_id uuid;
begin
  v_issue_id := (p->>'issue_id')::uuid;
  v_device_id := (p->>'device_id')::uuid;
  v_vehicle_id := (p->>'vehicle_id')::uuid;
  v_device_status_id := nullif(p->>'device_status_id', '')::uuid;
  v_hardware_id := nullif(p->>'hardware_id', '')::uuid;
  v_storage_id := nullif(p->>'storage_id', '')::uuid;
  v_replacements_id := nullif(p->>'replacements_id', '')::uuid;

  update public.vehicles
  set
    vehicle_number = coalesce(p->>'vehicle_number', ''),
    description = coalesce(p->>'vehicle_description', '')
  where id = v_vehicle_id;

  update public.device
  set
    imei = coalesce(p->>'imei', ''),
    description = coalesce(p->>'device_description', ''),
    tickets = nullif(trim(coalesce(p->>'device_tickets', '')), '')
  where id = v_device_id;

  if v_device_status_id is not null then
    update public.device_status
    set
      software_version = coalesce(p->>'software_version', ''),
      flespi_status = coalesce(p->>'flespi_status', ''),
      screen_status = coalesce(p->>'screen_status', ''),
      dotmatrix_status = coalesce(p->>'dotmatrix_status', ''),
      ssh_status = coalesce((p->>'ssh_status')::boolean, false),
      pmm_software = nullif(p->>'pmm_software', '')::double precision,
      description = coalesce(p->>'device_status_description', '')
    where id = v_device_status_id;
  else
    insert into public.device_status (
      device_id, software_version, flespi_status, screen_status, dotmatrix_status,
      ssh_status, pmm_software, description
    )
    values (
      v_device_id,
      coalesce(p->>'software_version', ''),
      coalesce(p->>'flespi_status', ''),
      coalesce(p->>'screen_status', ''),
      coalesce(p->>'dotmatrix_status', ''),
      coalesce((p->>'ssh_status')::boolean, false),
      nullif(p->>'pmm_software', '')::double precision,
      coalesce(p->>'device_status_description', '')
    );
  end if;

  if v_hardware_id is not null then
    update public.hardware
    set
      motherboard_type = coalesce(p->>'motherboard_type', ''),
      pmm_type = coalesce(p->>'pmm_type', ''),
      description = coalesce(p->>'hardware_description', '')
    where id = v_hardware_id;
  else
    insert into public.hardware (device_id, motherboard_type, pmm_type, description)
    values (
      v_device_id,
      coalesce(p->>'motherboard_type', ''),
      coalesce(p->>'pmm_type', ''),
      coalesce(p->>'hardware_description', '')
    );
  end if;

  if v_storage_id is not null then
    update public.storage
    set
      ssd_type = coalesce(p->>'ssd_type', ''),
      disk_health = coalesce((p->>'disk_health')::boolean, false),
      power_on_hours = coalesce((p->>'power_on_hours')::integer, 0),
      power_cycles = coalesce((p->>'power_cycles')::integer, 0),
      power_off = coalesce((p->>'power_off')::integer, 0),
      lifetime = coalesce((p->>'lifetime')::integer, 0),
      summary_ssd = coalesce(p->>'summary_ssd', ''),
      description = coalesce(p->>'storage_description', '')
    where id = v_storage_id;
  else
    insert into public.storage (
      device_id, ssd_type, disk_health, power_on_hours, power_cycles,
      power_off, lifetime, summary_ssd, description
    )
    values (
      v_device_id,
      coalesce(p->>'ssd_type', ''),
      coalesce((p->>'disk_health')::boolean, false),
      coalesce((p->>'power_on_hours')::integer, 0),
      coalesce((p->>'power_cycles')::integer, 0),
      coalesce((p->>'power_off')::integer, 0),
      coalesce((p->>'lifetime')::integer, 0),
      coalesce(p->>'summary_ssd', ''),
      coalesce(p->>'storage_description', '')
    );
  end if;

  if v_replacements_id is not null then
    update public.replacements
    set
      ssd = coalesce(nullif(trim(p->>'ssd'), ''), 'No')::public."SSD",
      motherboard = coalesce(nullif(trim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD",
      sata_cable = coalesce(nullif(trim(p->>'sata_cable'), ''), 'No')::public.sata_cable,
      imei_changed = coalesce(nullif(trim(p->>'imei_changed'), ''), 'false'),
      sim_changed = coalesce(nullif(trim(p->>'sim_changed'), ''), 'false'),
      device_changed = coalesce((p->>'device_changed')::boolean, false),
      description = coalesce(p->>'replacements_description', '')
    where id = v_replacements_id;
  else
    insert into public.replacements (
      device_id, ssd, motherboard, sata_cable,
      imei_changed, sim_changed, device_changed, description
    )
    values (
      v_device_id,
      coalesce(nullif(trim(p->>'ssd'), ''), 'No')::public."SSD",
      coalesce(nullif(trim(p->>'motherboard'), ''), 'No')::public."MOTHERBOARD",
      coalesce(nullif(trim(p->>'sata_cable'), ''), 'No')::public.sata_cable,
      coalesce(nullif(trim(p->>'imei_changed'), ''), 'false'),
      coalesce(nullif(trim(p->>'sim_changed'), ''), 'false'),
      coalesce((p->>'device_changed')::boolean, false),
      coalesce(p->>'replacements_description', '')
    );
  end if;

  update public.issues
  set
    issue_type = coalesce(p->>'issue_type', ''),
    motherboard_issue = coalesce(p->>'motherboard_issue', ''),
    pmm_issue = coalesce(p->>'pmm_issue', ''),
    ssd_issue = coalesce(p->>'ssd_issue', ''),
    other_issue = coalesce(p->>'other_issue', ''),
    description = coalesce(p->>'issue_description', ''),
    issue_source = coalesce(p->>'issue_source', '')
  where id = v_issue_id;

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

grant execute on function public.create_maintenance_record(jsonb) to anon, authenticated;
grant execute on function public.update_maintenance_record(jsonb) to anon, authenticated;

commit;

-- NOTIFY pgrst, 'reload schema';

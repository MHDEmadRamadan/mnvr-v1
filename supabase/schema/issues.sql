-- MNVR device maintenance schema (authoritative)
-- Run in Supabase SQL editor if tables do not exist yet.

create extension if not exists "pgcrypto";

-- vehicles
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null,
  description text not null default '',
  created_at timestamp not null default now()
);

-- device
create table if not exists public.device (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  imei text not null default '',
  description text not null default '',
  tickets text,
  created_at timestamp not null default now()
);

-- Migration for existing databases
alter table public.device add column if not exists tickets text;

create index if not exists device_vehicle_id_idx on public.device (vehicle_id);

-- device_vehicle_history (assignment audit trail for maintenance RPCs)
create table if not exists public.device_vehicle_history (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz
);

create index if not exists device_vehicle_history_device_id_idx
  on public.device_vehicle_history (device_id);

create index if not exists device_vehicle_history_vehicle_id_idx
  on public.device_vehicle_history (vehicle_id);

create unique index if not exists device_vehicle_history_active_device_idx
  on public.device_vehicle_history (device_id)
  where unassigned_at is null;

-- device_status
create table if not exists public.device_status (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  software_version text not null default '',
  flespi_status text not null default '',
  screen_status text not null default '',
  dotmatrix_status text not null default '',
  ssh_status boolean not null default false,
  pmm_software double precision,
  description text not null default '',
  created_at timestamp not null default now()
);

create index if not exists device_status_device_id_idx on public.device_status (device_id);

-- hardware
create table if not exists public.hardware (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  motherboard_type text not null default '',
  pmm_type text not null default '',
  description text not null default '',
  created_at timestamp not null default now()
);

create index if not exists hardware_device_id_idx on public.hardware (device_id);

-- storage
create table if not exists public.storage (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  ssd_type text not null default '',
  disk_health boolean not null default false,
  power_on_hours integer not null default 0,
  power_cycles integer not null default 0,
  power_off integer not null default 0,
  lifetime integer not null default 0,
  summary_ssd text not null default '',
  description text not null default '',
  created_at timestamp not null default now()
);

create index if not exists storage_device_id_idx on public.storage (device_id);

-- replacements (ENUM columns — aligned with frontend form)
do $$
begin
  create type public."SSD" as enum ('NEW', 'USED', 'No');
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

create table if not exists public.replacements (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  ssd public."SSD" not null default 'No',
  motherboard public."MOTHERBOARD" not null default 'No',
  sata_cable public.sata_cable not null default 'No',
  imei_changed text not null default 'false',
  sim_changed text not null default 'false',
  device_changed boolean not null default false,
  description text not null default '',
  created_at timestamp not null default now()
);

create index if not exists replacements_device_id_idx on public.replacements (device_id);

-- issues (main UI table)
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  issue_type text not null default '',
  motherboard_issue text not null default '',
  pmm_issue text not null default '',
  ssd_issue text not null default '',
  other_issue text not null default '',
  description text not null default '',
  issue_source text not null default '',
  created_at timestamp not null default now()
);

create index if not exists issues_device_id_idx on public.issues (device_id);
create index if not exists issues_created_at_idx on public.issues (created_at desc);

-- RLS (adjust policies when auth is added)
alter table public.issues enable row level security;

drop policy if exists "issues_select_anon" on public.issues;
drop policy if exists "issues_insert_anon" on public.issues;
drop policy if exists "issues_update_anon" on public.issues;
drop policy if exists "issues_delete_anon" on public.issues;

create policy "issues_select_anon"
  on public.issues for select to anon, authenticated using (true);

create policy "issues_insert_anon"
  on public.issues for insert to anon, authenticated with check (true);

create policy "issues_update_anon"
  on public.issues for update to anon, authenticated using (true) with check (true);

create policy "issues_delete_anon"
  on public.issues for delete to anon, authenticated using (true);

-- RLS for joined tables (read-only for dashboard)
alter table public.device enable row level security;
alter table public.vehicles enable row level security;
alter table public.device_status enable row level security;
alter table public.hardware enable row level security;
alter table public.storage enable row level security;
alter table public.replacements enable row level security;
alter table public.device_vehicle_history enable row level security;

drop policy if exists "device_select_anon" on public.device;
create policy "device_select_anon" on public.device for select to anon, authenticated using (true);

drop policy if exists "device_insert_anon" on public.device;
create policy "device_insert_anon" on public.device for insert to anon, authenticated with check (true);

drop policy if exists "vehicles_select_anon" on public.vehicles;
create policy "vehicles_select_anon" on public.vehicles for select to anon, authenticated using (true);

drop policy if exists "vehicles_insert_anon" on public.vehicles;
create policy "vehicles_insert_anon" on public.vehicles for insert to anon, authenticated with check (true);

drop policy if exists "device_status_select_anon" on public.device_status;
create policy "device_status_select_anon" on public.device_status for select to anon, authenticated using (true);

drop policy if exists "hardware_select_anon" on public.hardware;
create policy "hardware_select_anon" on public.hardware for select to anon, authenticated using (true);

drop policy if exists "storage_select_anon" on public.storage;
create policy "storage_select_anon" on public.storage for select to anon, authenticated using (true);

drop policy if exists "replacements_select_anon" on public.replacements;
create policy "replacements_select_anon" on public.replacements for select to anon, authenticated using (true);

-- Write policies for related tables (maintenance record create/update)
drop policy if exists "device_update_anon" on public.device;
create policy "device_update_anon" on public.device for update to anon, authenticated using (true) with check (true);

drop policy if exists "vehicles_update_anon" on public.vehicles;
create policy "vehicles_update_anon" on public.vehicles for update to anon, authenticated using (true) with check (true);

drop policy if exists "device_status_insert_anon" on public.device_status;
create policy "device_status_insert_anon" on public.device_status for insert to anon, authenticated with check (true);

drop policy if exists "device_status_update_anon" on public.device_status;
create policy "device_status_update_anon" on public.device_status for update to anon, authenticated using (true) with check (true);

drop policy if exists "hardware_insert_anon" on public.hardware;
create policy "hardware_insert_anon" on public.hardware for insert to anon, authenticated with check (true);

drop policy if exists "hardware_update_anon" on public.hardware;
create policy "hardware_update_anon" on public.hardware for update to anon, authenticated using (true) with check (true);

drop policy if exists "storage_insert_anon" on public.storage;
create policy "storage_insert_anon" on public.storage for insert to anon, authenticated with check (true);

drop policy if exists "storage_update_anon" on public.storage;
create policy "storage_update_anon" on public.storage for update to anon, authenticated using (true) with check (true);

drop policy if exists "replacements_insert_anon" on public.replacements;
create policy "replacements_insert_anon" on public.replacements for insert to anon, authenticated with check (true);

drop policy if exists "replacements_update_anon" on public.replacements;
create policy "replacements_update_anon" on public.replacements for update to anon, authenticated using (true) with check (true);

drop policy if exists "device_vehicle_history_select_anon" on public.device_vehicle_history;
create policy "device_vehicle_history_select_anon"
  on public.device_vehicle_history for select to anon, authenticated using (true);

-- Records device ↔ vehicle assignment changes (called by maintenance RPCs).
create or replace function public.record_device_vehicle_assignment(
  p_device_id uuid,
  p_new_vehicle_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_vehicle_id uuid;
begin
  if p_device_id is null or p_new_vehicle_id is null then
    return;
  end if;

  select vehicle_id into v_current_vehicle_id
  from public.device
  where id = p_device_id;

  if v_current_vehicle_id is null then
    return;
  end if;

  if v_current_vehicle_id is distinct from p_new_vehicle_id then
    update public.device_vehicle_history
    set unassigned_at = now()
    where device_id = p_device_id
      and unassigned_at is null;

    insert into public.device_vehicle_history (device_id, vehicle_id)
    values (p_device_id, p_new_vehicle_id);
  elsif not exists (
    select 1
    from public.device_vehicle_history
    where device_id = p_device_id
      and unassigned_at is null
  ) then
    insert into public.device_vehicle_history (device_id, vehicle_id)
    values (p_device_id, p_new_vehicle_id);
  end if;
end;
$$;

grant execute on function public.record_device_vehicle_assignment(uuid, uuid) to anon, authenticated;

-- Atomic create: vehicle → device → status → hardware → storage → replacements → issue
-- Returns all issues for the device (1 device → many issues).
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

-- Atomic update across all related tables; returns ALL issues for the device.
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

-- Cascade delete: issues → device (if no issues remain) → vehicle (if no devices remain).
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

-- Realtime (enable in Supabase Dashboard → Database → Replication if needed)
alter publication supabase_realtime add table public.issues;

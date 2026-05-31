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
  created_at timestamp not null default now()
);

create index if not exists device_vehicle_id_idx on public.device (vehicle_id);

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
  pmm_version double precision,
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

-- replacements
create table if not exists public.replacements (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.device (id) on delete cascade,
  new_ssd boolean not null default false,
  new_motherboard boolean not null default false,
  new_sata_cable boolean not null default false,
  imei_changed boolean not null default false,
  sim_changed boolean not null default false,
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

-- Realtime (enable in Supabase Dashboard → Database → Replication if needed)
alter publication supabase_realtime add table public.issues;

begin;

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

alter table public.device_vehicle_history enable row level security;

drop policy if exists "device_vehicle_history_select_anon" on public.device_vehicle_history;
create policy "device_vehicle_history_select_anon"
  on public.device_vehicle_history for select to anon, authenticated using (true);

insert into public.device_vehicle_history (device_id, vehicle_id, assigned_at)
select d.id, d.vehicle_id, coalesce(d.created_at, now())
from public.device d
where d.vehicle_id is not null
  and not exists (
    select 1
    from public.device_vehicle_history h
    where h.device_id = d.id
      and h.unassigned_at is null
  );

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

commit;

notify pgrst, 'reload schema';;

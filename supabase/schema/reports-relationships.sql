-- Reports module: verify FK used by PostgREST embed syntax vehicle:vehicle_id
-- Run in Supabase SQL editor if Reports fails with relationship / schema cache errors.

-- Expected relationship: public.device.vehicle_id -> public.vehicles.id
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'device_vehicle_id_fkey'
      and conrelid = 'public.device'::regclass
  ) then
    alter table public.device
      add constraint device_vehicle_id_fkey
      foreign key (vehicle_id) references public.vehicles (id) on delete cascade;
  end if;
end $$;

-- Reload PostgREST schema cache (Supabase API) after FK changes
notify pgrst, 'reload schema';

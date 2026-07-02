-- Reports module: ensure the FK used by PostgREST embed syntax vehicle:vehicle_id exists.
-- Run in Supabase SQL editor if Reports fails with relationship / schema cache errors.
--
-- Detects the relationship by TABLE + COLUMN (not by constraint name), so it matches the
-- production constraint `fk_vehicle` as well as the repo's default `device_vehicle_id_fkey`.
-- Idempotent: it never creates a duplicate foreign key.
--
-- Expected relationship: public.device.vehicle_id -> public.vehicles.id

do $$
begin
  if not exists (
    -- Any FK on public.device whose (single) constrained column is vehicle_id and which
    -- references public.vehicles — regardless of the constraint's name.
    select 1
    from pg_constraint c
    where c.contype = 'f'
      and c.conrelid = 'public.device'::regclass
      and c.confrelid = 'public.vehicles'::regclass
      and c.conkey = array[
        (select a.attnum
         from pg_attribute a
         where a.attrelid = 'public.device'::regclass
           and a.attname = 'vehicle_id'
           and not a.attisdropped)
      ]
  ) then
    -- Only reached when NO device.vehicle_id -> vehicles FK exists at all.
    -- Match the production constraint (name + ON DELETE SET NULL).
    alter table public.device
      add constraint fk_vehicle
      foreign key (vehicle_id) references public.vehicles (id) on delete set null;
  end if;
end $$;

-- Reload PostgREST schema cache (Supabase API) after FK changes
notify pgrst, 'reload schema';

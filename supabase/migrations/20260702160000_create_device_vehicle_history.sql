-- =============================================================================
-- Fix: create the missing table public.device_vehicle_history
-- =============================================================================
-- ROOT CAUSE: public.record_device_vehicle_assignment(uuid, uuid) reads/writes
--   public.device_vehicle_history, and it is called by create_maintenance_record()
--   and update_maintenance_record() on every ADD and EDIT. The table was never
--   created in production, so every ADD/EDIT aborts with:
--       42P01  relation "public.device_vehicle_history" does not exist
--
-- The column set below is derived from how record_device_vehicle_assignment uses it:
--   INSERT (device_id, vehicle_id)
--   UPDATE ... SET unassigned_at = now() WHERE device_id = $1 AND unassigned_at IS NULL
--   SELECT 1 ... WHERE device_id = $1 AND unassigned_at IS NULL
-- i.e. it needs: device_id, vehicle_id, an "assigned" timestamp, and a nullable
-- unassigned_at to mark the end of an assignment (open assignment = unassigned_at IS NULL).
-- =============================================================================

create table if not exists "public"."device_vehicle_history" (
    "id" uuid primary key default gen_random_uuid(),
    "device_id" uuid not null,
    "vehicle_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now(),
    "unassigned_at" timestamp with time zone
);

alter table "public"."device_vehicle_history" owner to "postgres";

-- Foreign keys consistent with the rest of the schema (device/vehicles cascade family).
alter table only "public"."device_vehicle_history"
    add constraint "device_vehicle_history_device_id_fkey"
    foreign key ("device_id") references "public"."device"("id") on delete cascade;

alter table only "public"."device_vehicle_history"
    add constraint "device_vehicle_history_vehicle_id_fkey"
    foreign key ("vehicle_id") references "public"."vehicles"("id") on delete cascade;

-- Indexes supporting the function's lookups (open assignment per device).
create index if not exists "device_vehicle_history_device_id_idx"
    on "public"."device_vehicle_history" ("device_id");

create index if not exists "device_vehicle_history_open_idx"
    on "public"."device_vehicle_history" ("device_id")
    where ("unassigned_at" is null);

-- RLS + grants mirroring sibling tables. (The maintenance RPCs are SECURITY DEFINER
-- owned by postgres and bypass RLS, so writes work regardless; these keep parity for
-- any direct API/reporting reads and match the pulled schema's grant pattern.)
alter table "public"."device_vehicle_history" enable row level security;

create policy "device_vehicle_history_select_anon"
  on "public"."device_vehicle_history" for select to "anon", "authenticated" using (true);

create policy "device_vehicle_history_insert_anon"
  on "public"."device_vehicle_history" for insert to "anon", "authenticated" with check (true);

create policy "device_vehicle_history_update_anon"
  on "public"."device_vehicle_history" for update to "anon", "authenticated" using (true) with check (true);

grant all on table "public"."device_vehicle_history" to "anon";
grant all on table "public"."device_vehicle_history" to "authenticated";
grant all on table "public"."device_vehicle_history" to "service_role";

notify pgrst, 'reload schema';

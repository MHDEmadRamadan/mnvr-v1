


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."MOTHERBOARD" AS ENUM (
    'NEW',
    'USED',
    'No'
);


ALTER TYPE "public"."MOTHERBOARD" OWNER TO "postgres";


CREATE TYPE "public"."SSD" AS ENUM (
    'NEW',
    'USED',
    'No'
);


ALTER TYPE "public"."SSD" OWNER TO "postgres";


CREATE TYPE "public"."sata_cable" AS ENUM (
    'NEW',
    'USED',
    'No'
);


ALTER TYPE "public"."sata_cable" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."coerce_replacement_motherboard"("p" "text") RETURNS "public"."MOTHERBOARD"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v_raw text := btrim(coalesce(p, ''));
  v text := upper(replace(v_raw, ' ', '_'));
begin
  if v_raw = '' or v in ('NO', 'FALSE') then
    return 'No'::public."MOTHERBOARD";
  end if;
  if v in ('NEW', 'NEW_MOTHERBOARD') then
    return 'NEW'::public."MOTHERBOARD";
  end if;
  if v in ('USED', 'USED_MOTHERBOARD') then
    return 'USED'::public."MOTHERBOARD";
  end if;
  if v_raw in ('NEW', 'USED', 'No') then
    return v_raw::public."MOTHERBOARD";
  end if;
  raise exception 'Invalid motherboard replacement value: %', p using errcode = 'P0001';
end;
$$;


ALTER FUNCTION "public"."coerce_replacement_motherboard"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."coerce_replacement_sata_cable"("p" "text") RETURNS "public"."sata_cable"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v_raw text := btrim(coalesce(p, ''));
  v text := upper(replace(v_raw, ' ', '_'));
begin
  if v_raw = '' or v in ('NO', 'FALSE') then
    return 'No'::public.sata_cable;
  end if;
  if v in ('NEW', 'NEW_SATA', 'NEW_SATA_CABLE') then
    return 'NEW'::public.sata_cable;
  end if;
  if v in ('USED', 'USED_SATA', 'USED_SATA_CABLE') then
    return 'USED'::public.sata_cable;
  end if;
  if v_raw in ('NEW', 'USED', 'No') then
    return v_raw::public.sata_cable;
  end if;
  raise exception 'Invalid sata_cable replacement value: %', p using errcode = 'P0001';
end;
$$;


ALTER FUNCTION "public"."coerce_replacement_sata_cable"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."coerce_replacement_ssd"("p" "text") RETURNS "public"."SSD"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v_raw text := btrim(coalesce(p, ''));
  v text := upper(replace(v_raw, ' ', '_'));
begin
  if v_raw = '' or v in ('NO', 'FALSE') then
    return 'No'::public."SSD";
  end if;
  if v in ('NEW', 'NEW_SSD', 'NEWSSD') or v_raw = 'NEW SSD' then
    return 'NEW'::public."SSD";
  end if;
  if v in ('USED', 'USED_SSD', 'USEDSSD') or v_raw = 'USED SSD' then
    return 'USED'::public."SSD";
  end if;
  if v_raw in ('NEW', 'USED', 'No') then
    return v_raw::public."SSD";
  end if;
  raise exception 'Invalid SSD replacement value: %', p using errcode = 'P0001';
end;
$$;


ALTER FUNCTION "public"."coerce_replacement_ssd"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_maintenance_record"("p" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
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

  insert into public.issues (device_id, issue_type, motherboard_issue, pmm_issue, ssd_issue, other_issue, description, issue_source)
  values (v_device_id, coalesce(p->>'issue_type', ''), coalesce(p->>'motherboard_issue', ''), coalesce(p->>'pmm_issue', ''), coalesce(p->>'ssd_issue', ''), coalesce(p->>'other_issue', ''), coalesce(p->>'issue_description', ''), coalesce(p->>'issue_source', ''));

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


ALTER FUNCTION "public"."create_maintenance_record"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_maintenance_records"("p_issue_ids" "uuid"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."delete_maintenance_records"("p_issue_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vehicle_by_number"("p_vehicle_number" "text") RETURNS TABLE("id" "uuid", "vehicle_number" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select v.id, v.vehicle_number
  from public.vehicles v
  where btrim(v.vehicle_number) = btrim(p_vehicle_number)
  limit 1;
$$;


ALTER FUNCTION "public"."get_vehicle_by_number"("p_vehicle_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_device_vehicle_assignment"("p_device_id" "uuid", "p_new_vehicle_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."record_device_vehicle_assignment"("p_device_id" "uuid", "p_new_vehicle_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_maintenance_record"("p" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
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

  update public.issues set device_id = v_target_device_id, issue_type = coalesce(p->>'issue_type', ''), motherboard_issue = coalesce(p->>'motherboard_issue', ''), pmm_issue = coalesce(p->>'pmm_issue', ''), ssd_issue = coalesce(p->>'ssd_issue', ''), other_issue = coalesce(p->>'other_issue', ''), description = coalesce(p->>'issue_description', ''), issue_source = coalesce(p->>'issue_source', '') where id = v_issue_id;

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


ALTER FUNCTION "public"."update_maintenance_record"("p" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."device" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid",
    "imei" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tickets" "text"
);


ALTER TABLE "public"."device" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."device_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "software_version" "text",
    "flespi_status" "text",
    "screen_status" "text",
    "dotmatrix_status" "text",
    "ssh_status" boolean,
    "pmm_software" double precision,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."device_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hardware" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "motherboard_type" "text",
    "pmm_type" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."hardware" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "issue_type" "text",
    "motherboard_issue" "text",
    "pmm_issue" "text",
    "ssd_issue" "text",
    "other_issue" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "issue_source" "text",
    "vehicle_id" "uuid"
);


ALTER TABLE "public"."issues" OWNER TO "postgres";


COMMENT ON COLUMN "public"."issues"."issue_source" IS 'RMA DTC / Cars / DTC';



CREATE OR REPLACE VIEW "public"."issues_safe" AS
 SELECT "i"."id",
    "i"."device_id",
    "i"."issue_type",
    "i"."motherboard_issue",
    "i"."pmm_issue",
    "i"."ssd_issue",
    "i"."other_issue",
    "i"."description",
    "i"."issue_source",
    "i"."created_at",
    "d"."vehicle_id"
   FROM ("public"."issues" "i"
     LEFT JOIN "public"."device" "d" ON (("d"."id" = "i"."device_id")));


ALTER VIEW "public"."issues_safe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."replacements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "ssd" "public"."SSD" DEFAULT 'No'::"public"."SSD",
    "motherboard" "public"."MOTHERBOARD" DEFAULT 'No'::"public"."MOTHERBOARD",
    "sata_cable" "public"."sata_cable" DEFAULT 'No'::"public"."sata_cable",
    "imei_changed" "text" DEFAULT 'No'::"text",
    "sim_changed" "text" DEFAULT 'No'::"text",
    "device_changed" boolean DEFAULT false,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."replacements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid",
    "ssd_type" "text",
    "disk_health" boolean,
    "power_on_hours" integer,
    "power_cycles" integer,
    "power_off" integer,
    "lifetime" integer,
    "summary_ssd" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."storage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_number" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."device"
    ADD CONSTRAINT "device_imei_key" UNIQUE ("imei");



ALTER TABLE ONLY "public"."device"
    ADD CONSTRAINT "device_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_status"
    ADD CONSTRAINT "device_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hardware"
    ADD CONSTRAINT "hardware_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."replacements"
    ADD CONSTRAINT "replacements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage"
    ADD CONSTRAINT "storage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_vehicle_number_key" UNIQUE ("vehicle_number");



CREATE INDEX "device_status_device_id_idx" ON "public"."device_status" USING "btree" ("device_id");



CREATE INDEX "device_vehicle_id_idx" ON "public"."device" USING "btree" ("vehicle_id");



CREATE INDEX "hardware_device_id_idx" ON "public"."hardware" USING "btree" ("device_id");



CREATE INDEX "issues_created_at_idx" ON "public"."issues" USING "btree" ("created_at" DESC);



CREATE INDEX "issues_device_id_idx" ON "public"."issues" USING "btree" ("device_id");



CREATE INDEX "replacements_device_id_idx" ON "public"."replacements" USING "btree" ("device_id");



CREATE INDEX "storage_device_id_idx" ON "public"."storage" USING "btree" ("device_id");



ALTER TABLE ONLY "public"."hardware"
    ADD CONSTRAINT "fk_device_hardware" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "fk_device_issues" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."replacements"
    ADD CONSTRAINT "fk_device_replacements" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_status"
    ADD CONSTRAINT "fk_device_status" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."storage"
    ADD CONSTRAINT "fk_device_storage" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device"
    ADD CONSTRAINT "fk_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "fk_vehicle_issues" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id");



CREATE POLICY "Enable read access for all users" ON "public"."vehicles" FOR SELECT USING (true);



ALTER TABLE "public"."device" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_insert_anon" ON "public"."device" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "device_select_anon" ON "public"."device" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."device_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_status_insert_anon" ON "public"."device_status" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "device_status_select_anon" ON "public"."device_status" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "device_status_update_anon" ON "public"."device_status" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "device_update_anon" ON "public"."device" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."hardware" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hardware_insert_anon" ON "public"."hardware" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "hardware_select_anon" ON "public"."hardware" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "hardware_update_anon" ON "public"."hardware" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "issues_delete_anon" ON "public"."issues" FOR DELETE TO "authenticated", "anon" USING (true);



CREATE POLICY "issues_insert_anon" ON "public"."issues" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "issues_select_anon" ON "public"."issues" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "issues_update_anon" ON "public"."issues" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."replacements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "replacements_insert_anon" ON "public"."replacements" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "replacements_select_anon" ON "public"."replacements" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "replacements_update_anon" ON "public"."replacements" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."storage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "storage_insert_anon" ON "public"."storage" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "storage_select_anon" ON "public"."storage" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "storage_update_anon" ON "public"."storage" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicles_insert_anon" ON "public"."vehicles" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "vehicles_select_anon" ON "public"."vehicles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "vehicles_update_anon" ON "public"."vehicles" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."issues";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."coerce_replacement_motherboard"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."coerce_replacement_motherboard"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."coerce_replacement_motherboard"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."coerce_replacement_sata_cable"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."coerce_replacement_sata_cable"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."coerce_replacement_sata_cable"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."coerce_replacement_ssd"("p" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."coerce_replacement_ssd"("p" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."coerce_replacement_ssd"("p" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_maintenance_record"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_maintenance_record"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_maintenance_record"("p" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_maintenance_records"("p_issue_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_maintenance_records"("p_issue_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_maintenance_records"("p_issue_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_vehicle_by_number"("p_vehicle_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_vehicle_by_number"("p_vehicle_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_vehicle_by_number"("p_vehicle_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."record_device_vehicle_assignment"("p_device_id" "uuid", "p_new_vehicle_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."record_device_vehicle_assignment"("p_device_id" "uuid", "p_new_vehicle_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_device_vehicle_assignment"("p_device_id" "uuid", "p_new_vehicle_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_maintenance_record"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_maintenance_record"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_maintenance_record"("p" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."device" TO "anon";
GRANT ALL ON TABLE "public"."device" TO "authenticated";
GRANT ALL ON TABLE "public"."device" TO "service_role";



GRANT ALL ON TABLE "public"."device_status" TO "anon";
GRANT ALL ON TABLE "public"."device_status" TO "authenticated";
GRANT ALL ON TABLE "public"."device_status" TO "service_role";



GRANT ALL ON TABLE "public"."hardware" TO "anon";
GRANT ALL ON TABLE "public"."hardware" TO "authenticated";
GRANT ALL ON TABLE "public"."hardware" TO "service_role";



GRANT ALL ON TABLE "public"."issues" TO "anon";
GRANT ALL ON TABLE "public"."issues" TO "authenticated";
GRANT ALL ON TABLE "public"."issues" TO "service_role";



GRANT ALL ON TABLE "public"."issues_safe" TO "anon";
GRANT ALL ON TABLE "public"."issues_safe" TO "authenticated";
GRANT ALL ON TABLE "public"."issues_safe" TO "service_role";



GRANT ALL ON TABLE "public"."replacements" TO "anon";
GRANT ALL ON TABLE "public"."replacements" TO "authenticated";
GRANT ALL ON TABLE "public"."replacements" TO "service_role";



GRANT ALL ON TABLE "public"."storage" TO "anon";
GRANT ALL ON TABLE "public"."storage" TO "authenticated";
GRANT ALL ON TABLE "public"."storage" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "device_insert_anon" on "public"."device";

drop policy "device_select_anon" on "public"."device";

drop policy "device_update_anon" on "public"."device";

drop policy "device_status_insert_anon" on "public"."device_status";

drop policy "device_status_select_anon" on "public"."device_status";

drop policy "device_status_update_anon" on "public"."device_status";

drop policy "hardware_insert_anon" on "public"."hardware";

drop policy "hardware_select_anon" on "public"."hardware";

drop policy "hardware_update_anon" on "public"."hardware";

drop policy "issues_delete_anon" on "public"."issues";

drop policy "issues_insert_anon" on "public"."issues";

drop policy "issues_select_anon" on "public"."issues";

drop policy "issues_update_anon" on "public"."issues";

drop policy "replacements_insert_anon" on "public"."replacements";

drop policy "replacements_select_anon" on "public"."replacements";

drop policy "replacements_update_anon" on "public"."replacements";

drop policy "storage_insert_anon" on "public"."storage";

drop policy "storage_select_anon" on "public"."storage";

drop policy "storage_update_anon" on "public"."storage";

drop policy "vehicles_insert_anon" on "public"."vehicles";

drop policy "vehicles_select_anon" on "public"."vehicles";

drop policy "vehicles_update_anon" on "public"."vehicles";


  create policy "device_insert_anon"
  on "public"."device"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "device_select_anon"
  on "public"."device"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "device_update_anon"
  on "public"."device"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "device_status_insert_anon"
  on "public"."device_status"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "device_status_select_anon"
  on "public"."device_status"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "device_status_update_anon"
  on "public"."device_status"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "hardware_insert_anon"
  on "public"."hardware"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "hardware_select_anon"
  on "public"."hardware"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "hardware_update_anon"
  on "public"."hardware"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "issues_delete_anon"
  on "public"."issues"
  as permissive
  for delete
  to anon, authenticated
using (true);



  create policy "issues_insert_anon"
  on "public"."issues"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "issues_select_anon"
  on "public"."issues"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "issues_update_anon"
  on "public"."issues"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "replacements_insert_anon"
  on "public"."replacements"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "replacements_select_anon"
  on "public"."replacements"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "replacements_update_anon"
  on "public"."replacements"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "storage_insert_anon"
  on "public"."storage"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "storage_select_anon"
  on "public"."storage"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "storage_update_anon"
  on "public"."storage"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);



  create policy "vehicles_insert_anon"
  on "public"."vehicles"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "vehicles_select_anon"
  on "public"."vehicles"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "vehicles_update_anon"
  on "public"."vehicles"
  as permissive
  for update
  to anon, authenticated
using (true)
with check (true);




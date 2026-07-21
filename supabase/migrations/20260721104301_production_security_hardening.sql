drop view if exists public.issues_safe;

revoke execute on function public.create_maintenance_record(jsonb) from anon, public;
revoke execute on function public.update_maintenance_record(jsonb) from anon, public;
revoke execute on function public.delete_maintenance_records(uuid[]) from anon, public;
revoke execute on function public.record_device_vehicle_assignment(uuid, uuid) from anon, public;
revoke execute on function public.revoke_user_sessions(uuid) from anon, public;
revoke execute on function public.handle_new_user() from anon, public, authenticated;
revoke execute on function public.is_admin() from anon, public;
revoke execute on function public.is_active_user() from anon, public;

grant execute on function public.create_maintenance_record(jsonb) to authenticated;
grant execute on function public.update_maintenance_record(jsonb) to authenticated;
grant execute on function public.delete_maintenance_records(uuid[]) to authenticated;
grant execute on function public.record_device_vehicle_assignment(uuid, uuid) to authenticated;
grant execute on function public.revoke_user_sessions(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_active_user() to authenticated;

create or replace function public.escape_ilike_pattern(p text)
returns text
language sql
immutable
set search_path = public
as $$
  select replace(replace(replace(coalesce(p, ''), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
$$;

create or replace function public.text_filter_matches(p_haystack text, p_filter jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_filter is null or p_filter = 'null'::jsonb then true
    when jsonb_typeof(p_filter) = 'array' then
      case
        when jsonb_array_length(p_filter) = 0 then true
        else exists (
          select 1
          from jsonb_array_elements_text(p_filter) as t(val)
          where nullif(trim(t.val), '') is not null
            and coalesce(p_haystack, '') ilike '%' || public.escape_ilike_pattern(trim(t.val)) || '%'
        )
      end
    when jsonb_typeof(p_filter) = 'string' then
      case
        when nullif(trim(p_filter #>> '{}'), '') is null then true
        else coalesce(p_haystack, '') ilike '%' || public.escape_ilike_pattern(trim(p_filter #>> '{}')) || '%'
      end
    else true
  end;
$$;

create or replace function public.bump_profile_permissions_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    old.role is distinct from new.role
    or old.disabled_at is distinct from new.disabled_at
  ) then
    new.permissions_version := coalesce(old.permissions_version, 1) + 1;
  end if;
  return new;
end;
$$;

create index if not exists issues_resolved_by_idx on public.issues (resolved_by);

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));;

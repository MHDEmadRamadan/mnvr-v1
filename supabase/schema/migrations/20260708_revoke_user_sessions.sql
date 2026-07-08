-- Revoke all sessions for a user by ID (service-role only).
-- admin.signOut() expects a JWT, not a user UUID — use this instead.

create or replace function public.revoke_user_sessions(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  delete from auth.refresh_tokens where user_id = target_user_id::text;
  delete from auth.sessions where user_id = target_user_id;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

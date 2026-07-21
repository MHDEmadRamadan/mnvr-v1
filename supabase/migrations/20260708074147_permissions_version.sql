alter table public.profiles
  add column if not exists permissions_version bigint not null default 1;

create or replace function public.bump_profile_permissions_version()
returns trigger
language plpgsql
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

drop trigger if exists profiles_bump_permissions_version on public.profiles;
create trigger profiles_bump_permissions_version
  before update on public.profiles
  for each row execute function public.bump_profile_permissions_version();

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;;

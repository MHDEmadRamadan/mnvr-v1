begin;

do $$ begin create type public.user_role as enum ('admin', 'user'); exception when duplicate_object then null; end $$;
do $$ begin create type public.issue_status as enum ('open', 'resolved'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  role public.user_role not null default 'user',
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);
alter table public.profiles enable row level security;

alter table public.issues
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists resolved_by uuid references public.profiles (id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists status public.issue_status not null default 'open';

create index if not exists issues_created_by_idx on public.issues (created_by);
create index if not exists issues_status_idx on public.issues (status);
create index if not exists issues_resolved_at_idx on public.issues (resolved_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and disabled_at is null);
$$;

create or replace function public.is_active_user() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and disabled_at is null);
$$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'user')
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), 'user'
from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id);

update public.profiles set role = 'admin', updated_at = now() where email = 'admin@iotistic.com';

commit;
notify pgrst, 'reload schema';;

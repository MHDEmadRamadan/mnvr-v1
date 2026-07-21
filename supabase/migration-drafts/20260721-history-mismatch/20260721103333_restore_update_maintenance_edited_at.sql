-- Keep Edited by / edited_at correct even if update_maintenance_record omits them
-- (drop_issue_source.sql previously recreated the RPC without edited_at).

create or replace function public.tg_issues_touch_edited_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.resolved_by := auth.uid();
  end if;
  new.edited_at := now();
  return new;
end;
$$;

drop trigger if exists trg_issues_touch_edited_at on public.issues;

create trigger trg_issues_touch_edited_at
before update on public.issues
for each row
execute function public.tg_issues_touch_edited_at();

grant execute on function public.tg_issues_touch_edited_at() to authenticated;

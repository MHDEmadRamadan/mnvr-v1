-- Allow authenticated users to read active profiles for issue creator/editor display names.
-- Without this, FK embeds (created_by -> profiles) return null for non-admin viewers.

drop policy if exists "profiles_select_display" on public.profiles;

create policy "profiles_select_display"
  on public.profiles for select to authenticated
  using (
    public.is_active_user()
    and disabled_at is null
  );

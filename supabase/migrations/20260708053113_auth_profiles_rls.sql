begin;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid() and public.is_active_user());
create policy "profiles_select_admin" on public.profiles for select to authenticated using (public.is_admin());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid() and public.is_active_user()) with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()) and disabled_at is null);
create policy "profiles_update_admin" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "issues_select_anon" on public.issues;
drop policy if exists "issues_insert_anon" on public.issues;
drop policy if exists "issues_update_anon" on public.issues;
drop policy if exists "issues_delete_anon" on public.issues;
drop policy if exists "device_select_anon" on public.device;
drop policy if exists "device_insert_anon" on public.device;
drop policy if exists "device_update_anon" on public.device;
drop policy if exists "vehicles_select_anon" on public.vehicles;
drop policy if exists "vehicles_insert_anon" on public.vehicles;
drop policy if exists "vehicles_update_anon" on public.vehicles;
drop policy if exists "Enable read access for all users" on public.vehicles;
drop policy if exists "device_status_select_anon" on public.device_status;
drop policy if exists "device_status_insert_anon" on public.device_status;
drop policy if exists "device_status_update_anon" on public.device_status;
drop policy if exists "hardware_select_anon" on public.hardware;
drop policy if exists "hardware_insert_anon" on public.hardware;
drop policy if exists "hardware_update_anon" on public.hardware;
drop policy if exists "storage_select_anon" on public.storage;
drop policy if exists "storage_insert_anon" on public.storage;
drop policy if exists "storage_update_anon" on public.storage;
drop policy if exists "replacements_select_anon" on public.replacements;
drop policy if exists "replacements_insert_anon" on public.replacements;
drop policy if exists "replacements_update_anon" on public.replacements;
drop policy if exists "device_vehicle_history_select_anon" on public.device_vehicle_history;

create policy "issues_select_authenticated" on public.issues for select to authenticated using (public.is_active_user());
create policy "issues_insert_authenticated" on public.issues for insert to authenticated with check (public.is_active_user());
create policy "issues_update_authenticated" on public.issues for update to authenticated using (public.is_active_user()) with check (public.is_active_user());
create policy "issues_delete_admin" on public.issues for delete to authenticated using (public.is_admin());

create policy "device_select_authenticated" on public.device for select to authenticated using (public.is_active_user());
create policy "vehicles_select_authenticated" on public.vehicles for select to authenticated using (public.is_active_user());
create policy "device_status_select_authenticated" on public.device_status for select to authenticated using (public.is_active_user());
create policy "hardware_select_authenticated" on public.hardware for select to authenticated using (public.is_active_user());
create policy "storage_select_authenticated" on public.storage for select to authenticated using (public.is_active_user());
create policy "replacements_select_authenticated" on public.replacements for select to authenticated using (public.is_active_user());
create policy "device_vehicle_history_select_authenticated" on public.device_vehicle_history for select to authenticated using (public.is_active_user());

commit;
notify pgrst, 'reload schema';;

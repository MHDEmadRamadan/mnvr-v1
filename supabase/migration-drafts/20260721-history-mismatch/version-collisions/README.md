# Version timestamp collisions — RESOLVED

Canonical history is the **linked remote / production** migration set.
Local files that reused the same version IDs for unrelated SQL were archived here
and must **not** be restored under those IDs.

| Version | Archived local (do not restore) | Canonical file kept in `supabase/migrations/` | Outcome |
|---------|----------------------------------|-----------------------------------------------|---------|
| `20260702151644` | `delete_maintenance_records.sql` | `20260702151644_remote_schema.sql` | Keep remote. Overlapping `delete_maintenance_records` body is equivalent (`search_path` syntax only). Auth/admin wrapping is applied later in `20260708053143_auth_profiles_rpcs_grants.sql`. |
| `20260702170000` | `align_maintenance_rpc.sql` | `20260702170000_remove_device_vehicle_history_dependency.sql` | Keep remote. Align ENUM/`new_ssd` path was never applied under this version on production; baseline `remote_schema` already has final enum/`text` columns. |

## Why no new migrations were added

- Production `supabase_migrations.schema_migrations` names match the fetched files.
- Replaying the current chain’s last writers yields **byte-identical** `prosrc` (MD5) for all 14 public functions vs production.
- Restoring archived local SQL under the same version IDs would reintroduce collisions.
- Editing production-applied migration files to re-inject local HEAD content is forbidden; later migrations already define the final `create`/`update`/`delete` RPCs.

## Maintenance RPC introduction chain (consistent)

1. **`20260702151644_remote_schema`** — introduces `create_maintenance_record`, `update_maintenance_record`, `delete_maintenance_records`, and `record_device_vehicle_assignment`.
2. **`20260702170000_remove_device_vehicle_history_dependency`** — rewrites create/update without `record_device_vehicle_assignment`; drops that helper.
3. **`20260707060336_device_vehicle_history`** — recreates `device_vehicle_history` + `record_device_vehicle_assignment`.
4. **`20260708053143_auth_profiles_rpcs_grants`** — auth/admin-wrapped `delete_maintenance_records` + grants (final delete body).
5. **`20260708084231_issues_edited_by_tracking`** — auth-wrapped `create_maintenance_record` (again calls record_assign).
6. **`20260708084257_update_maintenance_edited_by`** — auth-wrapped `update_maintenance_record`.
7. **`20260711120000_drop_issue_source`** — final create/update bodies (no `issue_source`; matches production MD5).
8. **`20260721104301_production_security_hardening`** — grant hardening (does not change those three bodies).

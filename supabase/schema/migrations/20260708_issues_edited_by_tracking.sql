-- Reuse resolved_by as "Edited by"; add edited_at. No open/resolved workflow changes in app logic.
-- create_maintenance_record: created_by = auth.uid(); do not set resolved_by.
-- update_maintenance_record: resolved_by = auth.uid(), edited_at = now().

alter table public.issues
  add column if not exists edited_at timestamptz;

create index if not exists issues_edited_at_idx on public.issues (edited_at);

-- Full create/update function bodies applied remotely via Supabase MCP migrations:
-- issues_edited_by_tracking, update_maintenance_edited_by.
-- Keep this file as the schema note + column migration for local/docs.

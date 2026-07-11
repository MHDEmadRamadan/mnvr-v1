-- Stable pagination ordering for large issues tables (created_at + id tie-breaker).
create index if not exists issues_created_at_id_idx on public.issues (created_at desc, id desc);

# Architectural Verification (Full Structural Pass)

**Date:** 2026-07-01
**Method:** Production accessed **read-only** via the PostgREST anon API (the only credential
available: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`). No writes, no DDL, no
destructive SQL were executed on production. Continues the Phase 1–6 work; completed items are not
repeated here.

## Access limitation (important)

With an **anon key only**, the following are observable: table columns, row data, enum labels,
and every foreign-key relation that PostgREST embedding relies on (by running the app's exact
embedded selects). The following **cannot be exhaustively enumerated** without the `service_role`
key or a direct Postgres connection: the complete list of functions, triggers, views, and full RLS
policy bodies. For those, the repository schema files (`supabase/schema/issues.sql`,
`reports-relationships.sql`, `schema/migrations/*`) are treated as the object definitions and were
cross-checked against observed behavior. A one-time `supabase db pull` with the service-role key is
recommended to lock a verified baseline (see finding V-4).

---

## What was verified against production (read-only)

| Area | Method | Result |
|------|--------|--------|
| Table inventory & columns | `GET /rest/v1/<t>?select=*&limit=1` on all 7 tables | Only structural drift is `issues.vehicle_id` (below). No other missing/extra columns. |
| FK relations used by the app | Ran the full `ISSUES_ENRICHED_SELECT` embed against `issues` | ✅ `issues→device`, `device→vehicle`, `device→{device_status,hardware,storage,replacements}` all resolve → relations present & consistent. |
| `issues.vehicle_id` relation | `issues?select=...,vehicle:vehicle_id(...)` | Resolves → it is a real FK to `vehicles` (redundant with `device.vehicle_id`). |
| Enum label sets | equality probes + data scan | `"SSD"`, `"MOTHERBOARD"`, `sata_cable` = `{NEW, USED, No}` — app now aligned. |
| RPC presence | `POST rpc/delete_maintenance_records {p_issue_ids:[]}` (safe no-op on empty) | ✅ exists (returned `{0,0,0}`). `create_/update_maintenance_record` are exercised by the live app; not called here to avoid writes. |
| RLS (anon) | `GET` on every table | anon can read all tables (see security finding V-2). |
| CRUD flows | Phase 5 (local mirror): create/read/update/delete + Reports + export + Settings | ✅ all pass. |
| Frontend pages | `/issues` (=Dashboard/KPIs), `/reports`, `/settings`; Add/Edit/Delete modals | ✅ aligned with production shape (there is no separate `/dashboard` route — the Issues page is the dashboard). |

---

## New findings (this pass)

### V-1 — `issues.vehicle_id` has drifted  ·  Severity: **Medium** (data integrity)

**Evidence:** of 103 issues, 99 have a non-null `vehicle_id`; **2** of those disagree with the
authoritative `device.vehicle_id`:

| issue id | issues.vehicle_id | device.vehicle_id |
|----------|-------------------|-------------------|
| `978a09c2-6561-4dcf-9e1c-0b0bb5887351` | `c60c05a9-…-3d6fb374226f` | `c104b7be-…-0555095c86ec` |
| `7ef0307b-d9c9-4c11-92ad-474698c7eaa4` | `2a11d3be-…-3c39db048079` | `336ae9cd-…-291da7738651` |

**Root cause:** `issues.vehicle_id` is a duplicated foreign key. It is not written/maintained by
`create_maintenance_record` (new rows get NULL — the 4 NULLs) and older rows carry stale values.
Because it duplicates a fact already stored on `device`, the two copies have diverged.

**User impact:** none — the app resolves the vehicle exclusively via `issues.device_id →
device.vehicle_id`, so the UI always shows the correct vehicle. The stale column is silently wrong.

**Fix (proposed, not executed):** drop `issues.vehicle_id` (already in `SQL_MIGRATIONS.sql` §B).
This removes the drift by removing the redundant copy; the authoritative `device.vehicle_id` is
retained. The pre-drop validation note was updated to reflect the 2 known mismatches.

### V-2 — Public anon key has full read/write/delete on all data  ·  Severity: **High** (security)

**Evidence:** RLS policies grant `anon` `SELECT/INSERT/UPDATE/DELETE` on `issues` (and writes on
the related tables), and `EXECUTE` on the `security definer` maintenance RPCs. The anon key is a
`NEXT_PUBLIC_*` value shipped to every browser. Anyone who loads the site (or reads the bundle) can
read, modify, and delete **all** production records. (Read access verified live; writes were **not**
attempted on production, but the policies/grants permit them.)

**Root cause:** the application has no authentication; RLS policies are open (`using (true)`) for the
`anon` role.

**Fix (proposed — requires a product decision, not executed):**
- Introduce Supabase Auth and scope policies to `authenticated` (remove `anon` write/delete), **or**
- Move all writes to server-side API routes using the `service_role` key (kept server-only) and
  restrict `anon` to read-only (or remove anon access entirely behind an authenticated gateway).
- At minimum, revoke `anon` `INSERT/UPDATE/DELETE` + RPC `EXECUTE` if writes can go server-side.

Note: `security definer` functions correctly `set search_path = public` (mitigates search-path
hijacking) — good.

### V-3 — Client-side full-dataset fetch  ·  Severity: **Low→Medium** (performance/scalability)

**Evidence:** `fetchEnrichedIssueDataset` selects up to `.limit(10000)` enriched rows and the UI
filters/sorts/paginates client-side (`runIssuePipeline`). KPI counts issue 3 queries using
non-sargable `ilike '%…%'` OR chains. Fine at ~103 rows; degrades as data grows, and silently
truncates beyond 10,000.

**Root cause:** client-side pipeline instead of server pagination/filtering.

**Fix (proposed):** server-side pagination + filtering (PostgREST `range`/filters), push KPI counts
to indexed columns, and add trigram/GIN indexes if substring search must remain. Recommendation
only — no change made (avoids destabilizing the working UI).

### V-4 — Cannot fully enumerate prod functions/triggers/views with anon key  ·  Severity: **Low** (process)

**Root cause:** anon lacks catalog access; the OpenAPI root requires `service_role` (returns 401).

**Fix (proposed):** run `supabase db pull` (or introspect `pg_proc`/`pg_trigger`/`information_schema.views`)
with the `service_role` key once to snapshot a verified baseline and diff against the repo schema.

### V-5 — Residual duplicated logic (non-blocking)  ·  Severity: **Low**

The Phase 3 cleanup removed dead code and de-duplicated `escapeCsv`. Remaining overlaps are larger,
higher-risk refactors in the Reports module and are **documented, not changed** (they touch working
production read paths): parallel enriched-SELECT builders (`ISSUES_ENRICHED_SELECT` vs
`buildReportsSelect`), parallel filter appliers (`applyIssueFilters` vs `applyReportFilters`), two
`computeTotalPages`, and the `rowToRecord`/`cellText`/`cellValue` row→string triplication.

**Fix (proposed):** extract a shared enriched-select builder, a single filter-application module,
and one row→display mapper; unify `computeTotalPages`. Deferred to a dedicated, separately-tested
refactor.

---

## Conclusion

A full architectural verification was completed to the extent possible with anon-only production
access. **No new correctness/functional bugs were found** beyond those already fixed in Phases 1–6.
The remaining items are: one **Medium** data-integrity drift (V-1, resolved by the already-proposed
column drop), one **High** security posture issue inherent to the app's no-auth design (V-2), and
**Low/Medium** performance and process/duplication recommendations (V-3–V-5). All proposed
database changes remain **migration-only**; nothing destructive was run on production.

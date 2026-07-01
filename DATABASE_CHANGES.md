# DATABASE CHANGES (PROPOSED)

> ⚠️ **Nothing in this document was executed against production.** These are reviewed,
> migration-ready proposals. Run them only after a backup and human review, ideally in
> staging first. The executable statements live in `SQL_MIGRATIONS.sql`.

## Current production reality (baseline)

- `replacements.ssd` is enum `"SSD"` with labels **`NEW`, `USED`, `No`** (already correct).
- `issues` has an extra column **`vehicle_id`** (populated in 99/103 rows) that is redundant
  with `device.vehicle_id` and unused by the application.

---

## Change 1 — SSD enum: **no production migration needed**

Production already uses `('NEW','USED','No')`. The defect was purely in the application
(and in the committed `supabase/schema/issues.sql`, which created the enum with the wrong
labels `'NEW SSD','USED SSD','No'`). Both were fixed in code. Therefore **no `ALTER TYPE`
is required on production.**

For any database that was created from the *old* schema file (labels `NEW SSD`/`USED SSD`),
an optional realignment migration is provided in `SQL_MIGRATIONS.sql` (Section A) — it is a
no-op when the enum already matches production.

## Change 2 — Normalize `issues`: drop redundant `issues.vehicle_id` (DESTRUCTIVE — review required)

**Why:** `vehicle_id` on `issues` duplicates a relationship already expressed by
`issues.device_id → device.vehicle_id`. It is never written by the RPCs and never read by the
app, so it drifts (new rows are `NULL`). Removing it normalizes the design (removes a
duplicated foreign key and a partial/again-derivable column).

**Risk:** destructive and irreversible without a backup. Any external consumer (BI, exports,
scripts) that reads `issues.vehicle_id` would break. **Do not run without review + backup.**

**Safer rollout (recommended order):**
1. Backup / snapshot the database.
2. Confirm no external consumer references `issues.vehicle_id`.
3. (Optional, reversible first step) keep the column but stop relying on it — already true in code.
4. Only then run the guarded `DROP COLUMN` in `SQL_MIGRATIONS.sql` (Section B).

**Pre-drop validation query (read-only)** — compare the redundant column with the authoritative
device→vehicle link:

```sql
select count(*) as mismatches
from public.issues i
join public.device d on d.id = i.device_id
where i.vehicle_id is not null
  and i.vehicle_id <> d.vehicle_id;
```

**Update (architectural verification):** production currently returns **`2`** mismatches
(issues `978a09c2-6561-4dcf-9e1c-0b0bb5887351` and `7ef0307b-d9c9-4c11-92ad-474698c7eaa4`) — i.e. the
redundant column has already drifted. Since the app resolves the vehicle only via
`issues.device_id → device.vehicle_id`, `device.vehicle_id` is authoritative and dropping
`issues.vehicle_id` removes only the stale duplicate (no correct data lost). The mismatches are
evidence **for** removal, not a blocker.

## Change 3 — Security: restrict anon writes (REVIEW — needs product decision)

The public anon key currently permits full read/write/delete via open RLS + RPC `EXECUTE` grants.
A proposed lock-down (drop anon write policies, revoke RPC execute) is in `SQL_MIGRATIONS.sql` §C.
**Do not apply** until writes move server-side (service_role) or authentication is added, or the app
will break. See `ARCHITECTURE_VERIFICATION.md` finding V-2.

## Not changed (recommended follow-ups)

- **Reports vs Issues duplication** (`src/lib/reports/*` vs `src/lib/issues-*`) — consolidate query/
  filter/metric logic. Larger refactor; out of scope for this safety-focused change.
- Consider `NOT NULL` + FK review on `issues.device_id` (already FK + `on delete cascade`).

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a Next.js 16 (App Router, Turbopack) issues dashboard backed by Supabase. The app is 100% env-var driven against a Supabase instance and has no server without one. The VM image ships with Docker and the Supabase CLI preinstalled; the update script only refreshes npm deps (`npm ci`). Everything below is per-session run setup, not part of the update script.

### Start the backend (local Supabase) and app each session

1. Start the Docker daemon (no systemd here): run `sudo dockerd` in a background/tmux session. If `docker ps` shows a permission error, run `sudo chmod 666 /var/run/docker.sock`.
   - Docker 29 needs fuse-overlayfs: `/etc/docker/daemon.json` sets `storage-driver: fuse-overlayfs` and `features.containerd-snapshotter: false`, and iptables is switched to legacy. These persist in the image; only re-apply if `dockerd` fails to start.
2. Start Supabase: `supabase start` (from repo root; uses `supabase/config.toml`). If `config.toml` is missing, run `supabase init` first. This prints the local `API_URL` (http://127.0.0.1:54321) and `ANON_KEY`.
3. Apply the schema (idempotent, safe to re-run) into the DB container, then grant privileges (hosted Supabase grants these by default; local does not):
   - `docker cp supabase/schema/issues.sql supabase_db_workspace:/tmp/issues.sql`
   - `docker exec -e PGPASSWORD=postgres supabase_db_workspace psql -U postgres -d postgres -f /tmp/issues.sql`
   - Then grant to `anon, authenticated`: `grant usage on schema public ...; grant all on all tables/sequences/functions in schema public ...; alter default privileges ...; notify pgrst, 'reload schema';`
   - `supabase/schema/issues.sql` is the authoritative schema (tables, RLS with anon access, RPCs, realtime). The files under `supabase/schema/migrations/` are superseded by it.
4. Create `.env.local` (gitignored) with the values from `supabase start`:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
5. Run the app: `npm run dev` (http://localhost:3000, redirects to `/issues`). Restart it after changing `.env.local`.

### Commands
- Dev server: `npm run dev` — Lint: `npm run lint` — Tests: `npm test` (node:test via tsx) — RPC E2E helper: `npm run test:maintenance-rpc`.
- `npm run lint` currently reports 2 pre-existing `react-hooks/set-state-in-effect` errors (`useDebouncedValue.ts`, `useFieldSuggestions.ts`); they are unrelated to environment setup.
- Without a reachable Supabase + `.env.local`, pages still render but data fetches throw "Supabase is not configured" / permission errors.

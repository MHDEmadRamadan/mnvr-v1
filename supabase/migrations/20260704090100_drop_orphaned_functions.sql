-- =============================================================================
-- Migration: drop orphaned SQL functions (schema-drift cleanup)
-- =============================================================================
-- These functions exist in the pulled production schema but are defined nowhere in
-- the repository and are referenced by NOTHING:
--   * public.get_vehicle_by_number(text)            -- no app call, no SQL caller
--   * public.coerce_replacement_ssd(text)           -- RPCs cast enums directly, never call it
--   * public.coerce_replacement_motherboard(text)   -- idem
--   * public.coerce_replacement_sata_cable(text)    -- idem
--
-- Verified on a local mirror of the pulled production schema:
--   no other function body, view, column default, trigger, or pg_depend entry
--   references any of them. Removing them changes no application behavior.
--
-- Idempotent + safe to re-run.
-- =============================================================================

begin;
drop function if exists public.get_vehicle_by_number(text);
drop function if exists public.coerce_replacement_ssd(text);
drop function if exists public.coerce_replacement_motherboard(text);
drop function if exists public.coerce_replacement_sata_cable(text);
commit;
-- Reload PostgREST schema cache so the API no longer advertises the RPCs.
notify pgrst, 'reload schema';

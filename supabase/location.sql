-- ============================================================================
-- Pronto — coordinates on profiles, for the "distance between us" feature (run
-- once in the Supabase SQL Editor, after profiles.sql).
--
-- Both people share their location (it's required to send messages), and the app
-- shows the distance between them + each other's temperature. Coordinates are
-- visible only to the two participants (profiles RLS), same as the rest of the
-- profile. Nothing here is one-sided — both people see the same distance.
-- ============================================================================

alter table public.profiles add column if not exists lat real;
alter table public.profiles add column if not exists lon real;

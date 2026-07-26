-- ============================================================================
-- Pronto — mood/status on profiles (run once in the Supabase SQL Editor, after
-- profiles.sql which puts profiles on Realtime).
--
-- Each person picks a mood from a preset list; it's stored here and streams to
-- the other person live over Realtime.
-- ============================================================================

alter table public.profiles add column if not exists mood text;

-- ============================================================================
-- Pronto — weather columns on profiles (run once in the Supabase SQL Editor,
-- after profiles.sql, which puts profiles on Realtime).
--
-- Each device fetches its own weather (browser location → Open-Meteo) and writes
-- it here; because profiles stream over Realtime, the other person sees it live.
-- ============================================================================

alter table public.profiles add column if not exists weather_temp real;
alter table public.profiles add column if not exists weather_city text;
alter table public.profiles add column if not exists weather_code integer;
alter table public.profiles add column if not exists weather_at   timestamptz;

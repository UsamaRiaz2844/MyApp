-- ============================================================================
-- Pronto — profile pictures + live presence migration (run once in the Supabase
-- SQL Editor, after schema.sql).
--
-- 1) avatar_url on profiles + a public `avatars` storage bucket so people can
--    set a profile picture.
-- 2) Stream profile changes over Realtime so online / last-seen and avatar
--    updates reach the other person live. Online status is now derived from a
--    fresh last_seen heartbeat (see the client), which self-heals the old
--    "stuck online" bug when an app is killed without a clean disconnect.
-- ============================================================================

alter table public.profiles add column if not exists avatar_url text;

-- --- avatars bucket (public read; each user writes only under <their uid>/) --
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- realtime on profiles (RLS still applies: any authed user may read) ------
alter table public.profiles replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end $$;

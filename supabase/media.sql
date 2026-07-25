-- ============================================================================
-- Pronto — media messages migration (run once in the Supabase SQL Editor,
-- after schema.sql + features.sql). Adds: image attachments and voice notes.
--
-- Frontend degrades gracefully: it only writes the attachment_* columns when a
-- message actually carries media, so plain text/whisper messaging keeps working
-- even before this migration has been run. Sending an image or voice note,
-- however, requires this file to have been applied (columns + storage bucket).
-- ============================================================================

-- --- attachment columns on messages ----------------------------------------
-- attachment_type is 'image' | 'audio'. attachment_url is a public URL in the
-- chat-media bucket. attachment_duration_ms is the clip length for voice notes.
alter table public.messages add column if not exists attachment_url         text;
alter table public.messages add column if not exists attachment_type        text
  check (attachment_type in ('image', 'audio'));
alter table public.messages add column if not exists attachment_duration_ms integer;

-- The base schema declares messages.text NOT NULL. Media-only messages carry an
-- empty string for text, which satisfies NOT NULL and the length check, so no
-- change is needed there. (messages already has replica identity full and is in
-- the supabase_realtime publication, so the new columns stream automatically.)

-- --- storage bucket for chat media -----------------------------------------
-- Public-read keeps rendering trivial (<img>/<audio> use the public URL with no
-- signed-URL round-trips). Objects live under `<conversationId>/<uuid>.<ext>`;
-- the paths are unguessable and writes are restricted to conversation members,
-- fitting this private two-person app.
insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

-- Only a member of the conversation named by the first path segment may upload.
drop policy if exists chat_media_insert on storage.objects;
create policy chat_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- Members may delete media from their own conversation (used when a message is
-- deleted, and to clean up cancelled uploads).
drop policy if exists chat_media_delete on storage.objects;
create policy chat_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-media'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

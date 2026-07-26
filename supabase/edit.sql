-- ============================================================================
-- Pronto — edit-message migration (run once in the Supabase SQL Editor, after
-- schema.sql). Adds WhatsApp-style editing of your own sent messages.
--
-- edited_at is stamped when a message's text is changed (null = never edited).
-- The base schema only lets the *receiver* update a message (to mark it seen),
-- so we add a second policy letting the *sender* update their own message —
-- both are permissive and OR together.
-- ============================================================================

alter table public.messages add column if not exists edited_at timestamptz;

drop policy if exists messages_update_own on public.messages;
create policy messages_update_own on public.messages
  for update to authenticated
  using (sender = auth.uid())
  with check (sender = auth.uid());

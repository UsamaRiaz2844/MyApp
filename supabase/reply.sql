-- ============================================================================
-- Pronto — reply-to-message migration (run once in the Supabase SQL Editor,
-- after schema.sql). Adds WhatsApp-style quoted replies.
--
-- A message can point at an earlier message in the same conversation via
-- reply_to. On delete of the original we null the reference (the reply stays,
-- its quote just shows "Message unavailable"). messages already has replica
-- identity full + is in the supabase_realtime publication, so the new column
-- streams automatically. The client only writes reply_to when set, so sending
-- still works if this migration hasn't been run yet.
-- ============================================================================

alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;

create index if not exists messages_reply_to_idx on public.messages (reply_to);

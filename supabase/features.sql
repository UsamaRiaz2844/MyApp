-- ============================================================================
-- Pronto — feature pack migration (run once in the Supabase SQL Editor,
-- after schema.sql). Adds: reactions, per-chat theme, whisper messages,
-- message delete, chat delete — all with RLS + realtime.
-- ============================================================================

-- --- whisper messages (blurred until held) ---------------------------------
alter table public.messages add column if not exists is_whisper boolean default false;

-- --- per-conversation theme ------------------------------------------------
alter table public.conversations add column if not exists theme text;

-- --- reactions (one emoji per user per message) ----------------------------
create table if not exists public.message_reactions (
  message_id      uuid not null references public.messages(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  emoji           text not null,
  updated_at      timestamptz default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;

drop policy if exists reactions_select on public.message_reactions;
create policy reactions_select on public.message_reactions
  for select to authenticated using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
  );

drop policy if exists reactions_write on public.message_reactions;
create policy reactions_write on public.message_reactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
  );

-- --- deletes ---------------------------------------------------------------
-- A sender may delete their own message (delete-for-everyone, fitting a 1:1 app).
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages
  for delete to authenticated using (sender = auth.uid());

-- Either participant may delete the whole conversation, or update it (theme).
drop policy if exists conversations_delete on public.conversations;
create policy conversations_delete on public.conversations
  for delete to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists conversations_update on public.conversations;
create policy conversations_update on public.conversations
  for update to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b)
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- --- realtime --------------------------------------------------------------
alter table public.message_reactions replica identity full;
alter table public.conversations     replica identity full;

do $$
begin
  begin alter publication supabase_realtime add table public.message_reactions;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then null; end;
end $$;

-- ============================================================================
-- Pronto — "stop" to freeze a chat (run once in the Supabase SQL Editor,
-- after schema.sql).
--
-- When someone sends the message "stop", the client sets conversations.stopped_by
-- to that person. While it's set, only that person can send messages; the other
-- person's composer is disabled AND the database rejects their inserts. As soon
-- as the person who stopped it sends anything again, the chat resumes.
--
-- Enforcement is a small BEFORE INSERT trigger named so it runs before the main
-- message trigger (alphabetical order: on_message_a_stop < on_message_insert).
-- It doesn't read message text, so it works fine with encryption.
-- ============================================================================

alter table public.conversations
  add column if not exists stopped_by uuid references public.profiles(id) on delete set null;

create or replace function public.enforce_chat_stop()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_stopped uuid;
begin
  select stopped_by into v_stopped from public.conversations where id = new.conversation_id;
  if v_stopped is not null then
    if new.sender <> v_stopped then
      raise exception 'CHAT_STOPPED';
    end if;
    -- the person who stopped it is messaging again → resume
    update public.conversations set stopped_by = null where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_message_a_stop on public.messages;
create trigger on_message_a_stop
  before insert on public.messages
  for each row execute function public.enforce_chat_stop();

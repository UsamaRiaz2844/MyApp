-- ============================================================================
-- Pronto — end-to-end encryption migration (run once in the Supabase SQL
-- Editor, after schema.sql + features.sql + media.sql).
--
-- Messages, voice notes and images are encrypted in the browser with a shared
-- passphrase (AES-GCM); the server only ever stores ciphertext. Existing
-- plaintext messages are left untouched and stay readable.
--
-- The one wrinkle: the late-reply timer's "hi/hi … bye/bye" detection runs in a
-- server trigger that reads the message text — which it can no longer see once
-- text is encrypted. So the client classifies greet/bye on the plaintext and
-- sends the result in `enc_marker`; the trigger uses that for encrypted
-- messages and falls back to the original regex for plaintext ones. Delay
-- timing is unchanged (it only needs timestamps, which stay in the clear).
-- ============================================================================

-- --- columns ---------------------------------------------------------------
-- On messages: whether the row is encrypted, and the client's greet/bye hint.
alter table public.messages add column if not exists is_encrypted boolean default false;
alter table public.messages add column if not exists enc_marker text
  check (enc_marker in ('greet', 'bye'));

-- On conversations: the (public, non-secret) PBKDF2 salt and a verifier token
-- encrypted with the derived key, so a second device can confirm it typed the
-- same passphrase. These are safe to store server-side.
alter table public.conversations add column if not exists enc_salt  text;
alter table public.conversations add column if not exists enc_check text;

-- --- updated message trigger ------------------------------------------------
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  d          text;
  s          public.late_reply_stats;
  is_greet   boolean;
  is_bye     boolean;
  greeted    uuid[];
  byed       uuid[];
  new_delay  integer := null;
  cur        bigint;
begin
  if new.created_at is null then new.created_at := now(); end if;
  d := to_char((new.created_at at time zone 'UTC'), 'YYYY-MM-DD');

  -- derive receiver from the conversation
  select case when c.user_a = new.sender then c.user_b else c.user_a end
    into new.receiver
    from public.conversations c
   where c.id = new.conversation_id;

  -- greet/bye: for encrypted messages the server can't read the text, so trust
  -- the client's enc_marker; for plaintext messages use the original regexes.
  if coalesce(new.is_encrypted, false) then
    is_greet := new.enc_marker = 'greet';
    is_bye   := new.enc_marker = 'bye';
  else
    is_greet := new.text ~* '^(hi+|hello+|hey+|yo|hiya|sup)[!.[:space:]]*$';
    is_bye   := new.text ~* '^(bye+|goodbye|good[[:space:]]*bye|bbye|cya|see[[:space:]]*ya|farewell|gn|good[[:space:]]*night)[!.[:space:]]*$';
  end if;

  -- ensure today's stat row exists, then lock it
  insert into public.late_reply_stats (conversation_id, date)
    values (new.conversation_id, d)
    on conflict (conversation_id, date) do nothing;
  select * into s from public.late_reply_stats
    where conversation_id = new.conversation_id and date = d for update;

  greeted := s.greeted_by;
  byed    := s.byed_by;

  if not s.active then
    if is_greet then
      if not (new.sender = any(greeted)) then greeted := array_append(greeted, new.sender); end if;
      if (new.receiver = any(greeted)) and (new.sender = any(greeted)) then
        s.active := true; greeted := '{}'; byed := '{}';
      end if;
    end if;
  else
    if is_bye then
      if not (new.sender = any(byed)) then byed := array_append(byed, new.sender); end if;
      if (new.receiver = any(byed)) and (new.sender = any(byed)) then
        s.active := false; byed := '{}'; greeted := '{}';
      end if;
    elsif s.last_message_at is not null and s.last_sender = new.receiver then
      new_delay := greatest(0, (extract(epoch from (new.created_at - s.last_message_at)) * 1000))::integer;
      cur := coalesce((s.late_ms ->> new.sender::text)::bigint, 0);
      s.late_ms := jsonb_set(s.late_ms, array[new.sender::text], to_jsonb(cur + new_delay), true);
    end if;
  end if;

  new.delay_ms := new_delay;

  update public.late_reply_stats
     set active = s.active, greeted_by = greeted, byed_by = byed,
         late_ms = s.late_ms, last_message_at = new.created_at, last_sender = new.sender
   where id = s.id;

  update public.conversations
     set last_message_text = new.text, last_message_sender = new.sender, last_message_at = new.created_at
   where id = new.conversation_id;

  return new;
end;
$$;

-- Trigger definition is unchanged; re-assert it for a clean single-file run.
drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  before insert on public.messages
  for each row execute function public.handle_new_message();

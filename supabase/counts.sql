-- ============================================================================
-- Pronto — late-reply fix + all-time message counts (run once in the Supabase
-- SQL Editor, after schema.sql + encryption.sql).
--
-- #6  Late-reply now counts from the FIRST unanswered message of a person's
--     turn, not the last. We track streak_started_at = when the current speaker
--     began their consecutive run; a reply's delay is measured from that.
--     Example: you message at 0:00, again at 1:00, partner replies at 1:15 →
--     their late-reply is 1h15m (from your first message), not 15m.
--
-- #9  A running, per-pair message tally that survives deleting the chat (it's
--     keyed by the user pair, not the conversation, so recreating the chat
--     keeps the totals). Maintained by the same insert trigger.
-- ============================================================================

alter table public.late_reply_stats add column if not exists streak_started_at timestamptz;

-- --- all-time counts per user pair (independent of conversations) -----------
create table if not exists public.pair_message_counts (
  user_a     uuid not null references public.profiles(id) on delete cascade,
  user_b     uuid not null references public.profiles(id) on delete cascade,
  count_a    integer not null default 0,
  count_b    integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

alter table public.pair_message_counts enable row level security;

drop policy if exists pmc_select on public.pair_message_counts;
create policy pmc_select on public.pair_message_counts
  for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
-- writes happen only via the security-definer trigger below.

-- --- rewritten insert trigger ----------------------------------------------
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  d            text;
  s            public.late_reply_stats;
  is_greet     boolean;
  is_bye       boolean;
  greeted      uuid[];
  byed         uuid[];
  new_delay    integer := null;
  cur          bigint;
  ua           uuid;
  ub           uuid;
  turn_switch  boolean;
  new_streak   timestamptz;
begin
  if new.created_at is null then new.created_at := now(); end if;
  d := to_char((new.created_at at time zone 'UTC'), 'YYYY-MM-DD');

  -- conversation participants + receiver
  select c.user_a, c.user_b into ua, ub from public.conversations c where c.id = new.conversation_id;
  new.receiver := case when ua = new.sender then ub else ua end;

  -- all-time count (independent of the conversation lifetime)
  insert into public.pair_message_counts (user_a, user_b, count_a, count_b)
    values (ua, ub, case when new.sender = ua then 1 else 0 end, case when new.sender = ub then 1 else 0 end)
    on conflict (user_a, user_b) do update
      set count_a = public.pair_message_counts.count_a + case when new.sender = ua then 1 else 0 end,
          count_b = public.pair_message_counts.count_b + case when new.sender = ub then 1 else 0 end,
          updated_at = now();

  -- greet/bye: trust the client's marker for encrypted rows, else regex
  if coalesce(new.is_encrypted, false) then
    is_greet := new.enc_marker = 'greet';
    is_bye   := new.enc_marker = 'bye';
  else
    is_greet := new.text ~* '^(hi+|hello+|hey+|yo|hiya|sup)[!.[:space:]]*$';
    is_bye   := new.text ~* '^(bye+|goodbye|good[[:space:]]*bye|bbye|cya|see[[:space:]]*ya|farewell|gn|good[[:space:]]*night)[!.[:space:]]*$';
  end if;

  insert into public.late_reply_stats (conversation_id, date)
    values (new.conversation_id, d)
    on conflict (conversation_id, date) do nothing;
  select * into s from public.late_reply_stats
    where conversation_id = new.conversation_id and date = d for update;

  greeted := s.greeted_by;
  byed    := s.byed_by;
  turn_switch := (s.last_sender is null) or (s.last_sender is distinct from new.sender);

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
    elsif s.last_sender is not null and s.last_sender is distinct from new.sender then
      -- replying to the other person's run: measure from their FIRST message
      new_delay := greatest(0, (extract(epoch from (new.created_at - coalesce(s.streak_started_at, s.last_message_at))) * 1000))::integer;
      cur := coalesce((s.late_ms ->> new.sender::text)::bigint, 0);
      s.late_ms := jsonb_set(s.late_ms, array[new.sender::text], to_jsonb(cur + new_delay), true);
    end if;
  end if;

  -- streak resets whenever the speaker changes, otherwise it carries forward
  if turn_switch then
    new_streak := new.created_at;
  else
    new_streak := coalesce(s.streak_started_at, new.created_at);
  end if;

  new.delay_ms := new_delay;

  update public.late_reply_stats
     set active = s.active, greeted_by = greeted, byed_by = byed,
         late_ms = s.late_ms, last_message_at = new.created_at, last_sender = new.sender,
         streak_started_at = new_streak
   where id = s.id;

  update public.conversations
     set last_message_text = new.text, last_message_sender = new.sender, last_message_at = new.created_at
   where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  before insert on public.messages
  for each row execute function public.handle_new_message();

-- ============================================================================
-- Pronto — Supabase schema (run this once in your project's SQL Editor)
-- Postgres + Row Level Security + Realtime. Replaces the old Express/Mongo/
-- Socket.IO backend entirely — there is no server to host.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per user, mirrored from auth.users via a trigger (see below).
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text,
  avatar_color text default '#6366f1',
  is_online    boolean default false,
  last_seen    timestamptz default now(),
  created_at   timestamptz default now()
);

-- One row per (ordered) pair of users. user_a is always the lexicographically
-- smaller id, so a pair maps to exactly one conversation.
create table if not exists public.conversations (
  id                  uuid primary key default gen_random_uuid(),
  user_a              uuid not null references public.profiles(id) on delete cascade,
  user_b              uuid not null references public.profiles(id) on delete cascade,
  last_message_text   text,
  last_message_sender uuid,
  last_message_at     timestamptz,
  created_at          timestamptz default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  receiver        uuid references public.profiles(id) on delete cascade,
  text            text not null check (char_length(text) <= 4000),
  delay_ms        integer,
  seen_at         timestamptz,
  created_at      timestamptz default now()
);
create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- One row per conversation per UTC calendar day. Holds the "hi/hi … bye/bye"
-- late-reply session state machine, maintained by a trigger on message insert.
create table if not exists public.late_reply_stats (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  date            text not null,               -- YYYY-MM-DD (UTC)
  active          boolean default false,
  greeted_by      uuid[] default '{}',
  byed_by         uuid[] default '{}',
  last_message_at timestamptz,
  last_sender     uuid,
  late_ms         jsonb default '{}'::jsonb,   -- { "<userId>": <accumulated ms> }
  unique (conversation_id, date)
);

-- ---------------------------------------------------------------------------
-- New-user trigger: copy username/display/color from signup metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_color)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(new.raw_user_meta_data ->> 'display_name', lower(new.raw_user_meta_data ->> 'username')),
    coalesce(new.raw_user_meta_data ->> 'avatar_color', '#6366f1')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Message trigger: set receiver, run the late-reply state machine, stamp
-- delay_ms, and keep conversations.last_message_* fresh. Server-authoritative.
-- ---------------------------------------------------------------------------
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

  is_greet := new.text ~* '^(hi+|hello+|hey+|yo|hiya|sup)[!.[:space:]]*$';
  is_bye   := new.text ~* '^(bye+|goodbye|good[[:space:]]*bye|bbye|cya|see[[:space:]]*ya|farewell|gn|good[[:space:]]*night)[!.[:space:]]*$';

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

drop trigger if exists on_message_insert on public.messages;
create trigger on_message_insert
  before insert on public.messages
  for each row execute function public.handle_new_message();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.late_reply_stats enable row level security;

-- profiles: any signed-in user can read (needed to search + show partners);
-- you may only update your own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- conversations: only participants can see / create.
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated with check (auth.uid() = user_a or auth.uid() = user_b);

-- messages: participants can read; you can insert as yourself into your own
-- conversations; the receiver may mark messages seen.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (auth.uid() = sender or auth.uid() = receiver);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated with check (
    sender = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated using (auth.uid() = receiver) with check (auth.uid() = receiver);

-- late_reply_stats: participants can read (writes happen via the definer trigger).
drop policy if exists late_stats_select on public.late_reply_stats;
create policy late_stats_select on public.late_reply_stats
  for select to authenticated using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for messages + late stats (RLS still applies,
-- so users only receive rows they are allowed to see). REPLICA IDENTITY FULL
-- lets RLS evaluate UPDATE events (e.g. marking messages seen).
-- ---------------------------------------------------------------------------
alter table public.messages         replica identity full;
alter table public.late_reply_stats replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.late_reply_stats;
  exception when duplicate_object then null;
  end;
end $$;

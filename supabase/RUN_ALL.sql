-- ============================================================================
-- Pronto — RUN THIS ONCE in the Supabase SQL Editor.
--
-- It's every pending feature migration combined, in order, and it's safe to run
-- more than once (idempotent). After this: stop-chat, weather, mood, location +
-- distance, the cat's growth, and the mini-games + scoreboard all work.
--
-- (This assumes the base schema.sql / features.sql / media.sql / encryption.sql /
-- reply.sql / edit.sql / profiles.sql / counts.sql were already run when you set
-- the app up. If a table is missing, run that base file too.)
-- ============================================================================

-- ---- stop: freeze a chat ---------------------------------------------------
alter table public.conversations
  add column if not exists stopped_by uuid references public.profiles(id) on delete set null;

create or replace function public.enforce_chat_stop()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_stopped uuid;
begin
  select stopped_by into v_stopped from public.conversations where id = new.conversation_id;
  if v_stopped is not null then
    if new.sender <> v_stopped then raise exception 'CHAT_STOPPED'; end if;
    update public.conversations set stopped_by = null where id = new.conversation_id;
  end if;
  return new;
end; $$;

drop trigger if exists on_message_a_stop on public.messages;
create trigger on_message_a_stop before insert on public.messages
  for each row execute function public.enforce_chat_stop();

-- ---- weather ---------------------------------------------------------------
alter table public.profiles add column if not exists weather_temp real;
alter table public.profiles add column if not exists weather_city text;
alter table public.profiles add column if not exists weather_code integer;
alter table public.profiles add column if not exists weather_at   timestamptz;

-- ---- mood ------------------------------------------------------------------
alter table public.profiles add column if not exists mood text;

-- ---- location (distance) ---------------------------------------------------
alter table public.profiles add column if not exists lat real;
alter table public.profiles add column if not exists lon real;

-- ---- pet (shared cat growth) ----------------------------------------------
alter table public.conversations add column if not exists pet_day_a    date;
alter table public.conversations add column if not exists pet_day_b    date;
alter table public.conversations add column if not exists pet_last_both date;
alter table public.conversations add column if not exists pet_streak   integer not null default 0;
alter table public.conversations add column if not exists pet_xp       integer not null default 0;

create or replace function public.pet_feed()
returns trigger language plpgsql security definer set search_path = public as $$
declare c record; today date := current_date; da date; db date;
begin
  select user_a, user_b, pet_day_a, pet_day_b, pet_last_both, pet_streak, pet_xp
    into c from public.conversations where id = new.conversation_id;
  da := c.pet_day_a; db := c.pet_day_b;
  if new.sender = c.user_a then da := today; end if;
  if new.sender = c.user_b then db := today; end if;
  if da = today and db = today and (c.pet_last_both is distinct from today) then
    update public.conversations set
      pet_day_a = da, pet_day_b = db, pet_last_both = today,
      pet_streak = case when c.pet_last_both = today - 1 then coalesce(c.pet_streak,0)+1 else 1 end,
      pet_xp = coalesce(c.pet_xp,0)+1
    where id = new.conversation_id;
  else
    update public.conversations set pet_day_a = da, pet_day_b = db where id = new.conversation_id;
  end if;
  return new;
end; $$;

drop trigger if exists on_message_pet on public.messages;
create trigger on_message_pet after insert on public.messages
  for each row execute function public.pet_feed();

-- ---- games + scoreboard ----------------------------------------------------
create table if not exists public.games (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  type            text not null,
  state           jsonb not null default '{}'::jsonb,
  turn            uuid,
  winner          text,
  status          text not null default 'active',
  created_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.games enable row level security;
drop policy if exists games_all on public.games;
create policy games_all on public.games for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.games replica identity full;

create table if not exists public.game_scores (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  wins            integer not null default 0,
  primary key (conversation_id, user_id)
);
alter table public.game_scores enable row level security;
drop policy if exists game_scores_all on public.game_scores;
create policy game_scores_all on public.game_scores for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.game_scores replica identity full;

create or replace function public.bump_game_score(p_conv uuid, p_user uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.game_scores (conversation_id, user_id, wins) values (p_conv, p_user, 1)
  on conflict (conversation_id, user_id) do update set wins = public.game_scores.wins + 1;
$$;

-- add the new tables to Realtime (guarded so re-running is safe)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='games') then
    alter publication supabase_realtime add table public.games;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_scores') then
    alter publication supabase_realtime add table public.game_scores;
  end if;
end $$;

-- ---- social: wyd/day-score + checklist + expenses + polls ------------------
alter table public.profiles add column if not exists activity     text;
alter table public.profiles add column if not exists day_score    integer;
alter table public.profiles add column if not exists day_score_at date;

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.checklist_items enable row level security;
drop policy if exists checklist_all on public.checklist_items;
create policy checklist_all on public.checklist_items for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.checklist_items replica identity full;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  payer uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.expenses replica identity full;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  question text not null,
  options jsonb not null,
  votes jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.polls enable row level security;
drop policy if exists polls_all on public.polls;
create policy polls_all on public.polls for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.polls replica identity full;

do $$
declare t text;
begin
  foreach t in array array['checklist_items','expenses','polls'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

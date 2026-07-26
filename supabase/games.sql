-- ============================================================================
-- Pronto — in-chat mini-games + scoreboard (run once in the Supabase SQL Editor,
-- after schema.sql). Turn-based games are stored as a row whose JSON state both
-- players update; Realtime streams the moves. A tiny scores table tracks wins.
-- ============================================================================

create table if not exists public.games (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  type            text not null,                 -- 'ttt' | 'rps'
  state           jsonb not null default '{}'::jsonb,
  turn            uuid,                           -- whose move (turn-based games)
  winner          text,                           -- player uuid, 'draw', or null
  status          text not null default 'active', -- 'active' | 'done'
  created_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.games enable row level security;

drop policy if exists games_all on public.games;
create policy games_all on public.games
  for all to authenticated
  using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
  )
  with check (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
  );

alter table public.games replica identity full;
alter publication supabase_realtime add table public.games;

-- Scoreboard --------------------------------------------------------------
create table if not exists public.game_scores (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  wins            integer not null default 0,
  primary key (conversation_id, user_id)
);

alter table public.game_scores enable row level security;

drop policy if exists game_scores_all on public.game_scores;
create policy game_scores_all on public.game_scores
  for all to authenticated
  using (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
  )
  with check (
    exists (select 1 from public.conversations c
            where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
  );

alter table public.game_scores replica identity full;
alter publication supabase_realtime add table public.game_scores;

create or replace function public.bump_game_score(p_conv uuid, p_user uuid)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.game_scores (conversation_id, user_id, wins)
  values (p_conv, p_user, 1)
  on conflict (conversation_id, user_id)
  do update set wins = public.game_scores.wins + 1;
$$;

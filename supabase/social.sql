-- ============================================================================
-- Pronto — shared "friends" features: to-do/plans list, who-owes-who expenses,
-- polls, plus "wyd" activity + daily 1–10 score on profiles.
-- Run once in the Supabase SQL Editor (after schema.sql). Safe to re-run.
-- ============================================================================

-- profiles: activity ("wyd") + daily score (streamed via existing profiles realtime)
alter table public.profiles add column if not exists activity     text;
alter table public.profiles add column if not exists day_score    integer;
alter table public.profiles add column if not exists day_score_at date;

-- helper: is the current user a participant of this conversation?
-- (inlined in each policy to avoid an extra function dependency)

-- ---- shared checklist / plans ---------------------------------------------
create table if not exists public.checklist_items (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  text            text not null,
  done            boolean not null default false,
  created_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now()
);
alter table public.checklist_items enable row level security;
drop policy if exists checklist_all on public.checklist_items;
create policy checklist_all on public.checklist_items for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.checklist_items replica identity full;

-- ---- expenses (who owes who) ----------------------------------------------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  payer           uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(12,2) not null,
  note            text,
  created_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now()
);
alter table public.expenses enable row level security;
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.expenses replica identity full;

-- ---- polls ----------------------------------------------------------------
create table if not exists public.polls (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  question        text not null,
  options         jsonb not null,                    -- array of strings
  votes           jsonb not null default '{}'::jsonb, -- { userId: optionIndex }
  created_by      uuid not null default auth.uid(),
  created_at      timestamptz not null default now()
);
alter table public.polls enable row level security;
drop policy if exists polls_all on public.polls;
create policy polls_all on public.polls for all to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())));
alter table public.polls replica identity full;

-- add to Realtime (guarded so re-running is safe)
do $$
declare t text;
begin
  foreach t in array array['checklist_items','expenses','polls'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

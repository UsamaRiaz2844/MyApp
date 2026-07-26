-- ============================================================================
-- Pronto — shared "chat cat" growth (run once in the Supabase SQL Editor, after
-- schema.sql). The cat's mood is computed in the app; this only tracks how it
-- grows: a streak of days you BOTH sent at least one message.
--
-- pet_xp counts the number of days you both chatted (level is derived from it in
-- the app). pet_streak is the current consecutive-day run. A small AFTER INSERT
-- trigger updates these; it never reads message text, so it works with
-- encryption.
-- ============================================================================

alter table public.conversations add column if not exists pet_day_a    date;
alter table public.conversations add column if not exists pet_day_b    date;
alter table public.conversations add column if not exists pet_last_both date;
alter table public.conversations add column if not exists pet_streak   integer not null default 0;
alter table public.conversations add column if not exists pet_xp       integer not null default 0;

create or replace function public.pet_feed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  c      record;
  today  date := current_date;
  da     date;
  db     date;
begin
  select user_a, user_b, pet_day_a, pet_day_b, pet_last_both, pet_streak, pet_xp
    into c
  from public.conversations
  where id = new.conversation_id;

  da := c.pet_day_a;
  db := c.pet_day_b;
  if new.sender = c.user_a then da := today; end if;
  if new.sender = c.user_b then db := today; end if;

  if da = today and db = today and (c.pet_last_both is distinct from today) then
    -- both have now chatted today, and we haven't counted today yet
    update public.conversations
    set pet_day_a = da,
        pet_day_b = db,
        pet_last_both = today,
        pet_streak = case when c.pet_last_both = today - 1 then coalesce(c.pet_streak, 0) + 1 else 1 end,
        pet_xp = coalesce(c.pet_xp, 0) + 1
    where id = new.conversation_id;
  else
    update public.conversations
    set pet_day_a = da, pet_day_b = db
    where id = new.conversation_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_pet on public.messages;
create trigger on_message_pet
  after insert on public.messages
  for each row execute function public.pet_feed();

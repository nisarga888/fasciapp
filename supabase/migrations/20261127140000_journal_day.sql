-- Daily Journal notes live in mood_notes, one private row per user per day.

alter table public.mood_notes drop constraint if exists mood_notes_mood_chk;
alter table public.mood_notes add constraint mood_notes_mood_chk
  check (mood in ('anxious','tired','pain','sleep','tense','overwhelmed','evening','journal'));

alter table public.mood_notes add column if not exists day date;

create unique index if not exists mood_notes_journal_day_idx
  on public.mood_notes (user_id, day)
  where mood = 'journal' and day is not null;

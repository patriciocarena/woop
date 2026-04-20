-- Phase 5: journal & behaviors.
-- One journal entry per (user, day) holding mood + notes; the set of behaviors
-- you logged that day lives in a side table for easy aggregation later.

create table public.journal_entries (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,

  mood            int check (mood is null or (mood between 1 and 5)),
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (user_id, date)
);

create index journal_entries_user_date_idx
  on public.journal_entries (user_id, date desc);

alter table public.journal_entries enable row level security;

create policy "journal: read own"
  on public.journal_entries for select using (auth.uid() = user_id);
create policy "journal: write own"
  on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();


-- Per-behavior log for the day. Keeping it as rows (not a JSON blob on
-- journal_entries) so future correlations / weekly assessments can group by
-- behavior_id without unpacking JSON in SQL.
create table public.behavior_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,

  -- Slug from the in-app catalog (lib/journal/behaviors.ts) — kept as text
  -- so the catalog can evolve without DB migrations.
  behavior_id     text not null,

  -- Optional quantity (e.g. cups of coffee, hours of screen time).
  -- Nullable for pure toggle behaviors (meditation: yes/no).
  amount          numeric,

  created_at      timestamptz not null default now(),

  unique (user_id, date, behavior_id)
);

create index behavior_logs_user_date_idx
  on public.behavior_logs (user_id, date desc);
create index behavior_logs_user_behavior_idx
  on public.behavior_logs (user_id, behavior_id, date desc);

alter table public.behavior_logs enable row level security;

create policy "behaviors: read own"
  on public.behavior_logs for select using (auth.uid() = user_id);
create policy "behaviors: write own"
  on public.behavior_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

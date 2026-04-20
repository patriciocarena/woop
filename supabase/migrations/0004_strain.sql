-- Phase 4: workouts and daily strain.
-- Each workout produces a TRIMP/strain contribution; the day's overall strain
-- is recomputed from the set of workouts + an ambient baseline (no wearable HR
-- means we can't measure ambient continuously, so we use a constant proxy).

create type public.sport as enum (
  'run', 'walk', 'ride', 'lift', 'swim', 'yoga', 'hiit', 'sport', 'other'
);

create table public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,

  sport           public.sport not null default 'other',
  started_at      timestamptz not null,
  duration_min    int not null check (duration_min > 0 and duration_min <= 600),

  -- HR fields are optional — we fall back to a perceived-effort estimate.
  avg_hr          int check (avg_hr is null or (avg_hr >= 30 and avg_hr <= 230)),
  max_hr          int check (max_hr is null or (max_hr >= 30 and max_hr <= 230)),

  -- Subjective fallback when HR isn't available (Borg 1..10 perceived effort).
  perceived_rpe   int check (perceived_rpe is null or (perceived_rpe between 1 and 10)),

  -- Cached single-workout strain on the 0..21 Borg scale.
  strain          numeric(4,2) check (strain is null or (strain >= 0 and strain <= 21)),

  notes           text,
  source          text not null default 'manual',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index workouts_user_date_idx on public.workouts (user_id, date desc, started_at desc);

alter table public.workouts enable row level security;

create policy "workouts: read own"
  on public.workouts for select using (auth.uid() = user_id);
create policy "workouts: write own"
  on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

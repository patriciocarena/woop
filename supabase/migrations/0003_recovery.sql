-- Phase 3: morning recovery readings.
-- One row per (user, date). Recovery score is denormalized for fast list reads;
-- it is recomputed every time a row is written using the rolling 30-day baseline.

create table public.recovery_metrics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                date not null,

  -- Required vitals
  hrv_ms              numeric(6,2) not null check (hrv_ms > 0),
  resting_hr          numeric(5,2) not null check (resting_hr > 0),

  -- Optional, used as a "warning" signal when present
  respiratory_rate    numeric(5,2) check (respiratory_rate is null or respiratory_rate > 0),
  skin_temp_c         numeric(4,2),

  -- Cached score 0..100 — written by the app at insert time
  recovery_score      numeric(5,2) check (recovery_score is null or (recovery_score >= 0 and recovery_score <= 100)),
  zone                text check (zone in ('low', 'mid', 'high', 'calibrating')),

  source              text not null default 'manual',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, date)
);

create index recovery_metrics_user_date_idx on public.recovery_metrics (user_id, date desc);

alter table public.recovery_metrics enable row level security;

create policy "recovery_metrics: read own"
  on public.recovery_metrics for select using (auth.uid() = user_id);
create policy "recovery_metrics: write own"
  on public.recovery_metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger recovery_metrics_set_updated_at
  before update on public.recovery_metrics
  for each row execute function public.set_updated_at();

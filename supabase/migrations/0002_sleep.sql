-- Phase 2: sleep tracking.
-- Stores main nightly sessions plus optional naps. Per-stage breakdown is JSON
-- to keep the schema flexible while we experiment with manual vs imported data.

create table public.sleep_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- The "sleep date" is the *wake* date — Whoop convention. A session that
  -- started 2026-04-19 23:30 and ended 2026-04-20 07:00 belongs to 2026-04-20.
  date            date not null,
  started_at      timestamptz not null,
  ended_at        timestamptz not null,

  -- Minutes tracked vs minutes actually asleep (asleep / time_in_bed = efficiency).
  time_in_bed_min int not null check (time_in_bed_min > 0),
  asleep_min      int not null check (asleep_min > 0 and asleep_min <= time_in_bed_min),
  disturbances    int not null default 0 check (disturbances >= 0),

  -- Optional stage breakdown (light/deep/rem/awake in minutes), nullable.
  stages          jsonb,

  -- 0..100 — computed at write time (denormalized for fast reads in lists).
  performance     numeric(5,2),

  source          text not null default 'manual',  -- manual | apple_health | google_fit | …
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (user_id, date)  -- one main session per night; naps live elsewhere
);

create index sleep_sessions_user_date_idx on public.sleep_sessions (user_id, date desc);

alter table public.sleep_sessions enable row level security;

create policy "sleep_sessions: read own"
  on public.sleep_sessions for select using (auth.uid() = user_id);
create policy "sleep_sessions: write own"
  on public.sleep_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger sleep_sessions_set_updated_at
  before update on public.sleep_sessions
  for each row execute function public.set_updated_at();

-- Naps: separate table because they don't get a "performance" score on their own
-- but their minutes feed back into the next night's sleep need calculation.
create table public.naps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  minutes     int not null check (minutes > 0),
  created_at  timestamptz not null default now()
);

create index naps_user_date_idx on public.naps (user_id, date desc);

alter table public.naps enable row level security;

create policy "naps: read own"
  on public.naps for select using (auth.uid() = user_id);
create policy "naps: write own"
  on public.naps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

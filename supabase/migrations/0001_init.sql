-- Phase 1 base schema. Run after creating a Supabase project.
-- All tables protected with Row Level Security so users only see their own rows.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: 1-to-1 with auth.users
-- ─────────────────────────────────────────────────────────────────────────
create type public.sex as enum ('male', 'female', 'other');

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  avatar_url            text,
  birth_date            date,
  sex                   public.sex,
  weight_kg             numeric(5,2),
  height_cm             numeric(5,2),
  max_hr                int,                  -- bpm, fallback 220 - age
  resting_hr_baseline   numeric(5,2),         -- rolling 30d baseline
  hrv_baseline          numeric(6,2),         -- rolling 30d baseline (ms)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile when a new auth user is created
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- daily_metrics: rollup of recovery/strain/sleep for a given (user, date).
-- Phases 2–4 will compute these from raw inputs in their own tables.
-- ─────────────────────────────────────────────────────────────────────────
create table public.daily_metrics (
  user_id            uuid not null references auth.users(id) on delete cascade,
  date               date not null,
  recovery_score     numeric(5,2),  -- 0..100
  strain_score       numeric(5,2),  -- 0..21
  sleep_performance  numeric(5,2),  -- 0..100
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, date)
);

create index daily_metrics_user_date_idx on public.daily_metrics (user_id, date desc);

alter table public.daily_metrics enable row level security;

create policy "daily_metrics: read own"
  on public.daily_metrics for select using (auth.uid() = user_id);
create policy "daily_metrics: write own"
  on public.daily_metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger helper, reused by later phases
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger daily_metrics_set_updated_at
  before update on public.daily_metrics
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- MasterSinger — Supabase schema (auth + monetização)
-- Run in: Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent).
-- ─────────────────────────────────────────────────────────────────────────

-- ── 1. profiles: per-user app data (already used by the sync feature) ──
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  profile     jsonb,
  melodies    jsonb,
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ── 2. subscriptions: paywall state (one row per user) ──
create table if not exists public.subscriptions (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  plan                text not null default 'trial',      -- 'free' | 'pro-monthly' | 'pro-yearly' | 'lifetime' | 'trial'
  status              text not null default 'trialing',   -- 'active' | 'trialing' | 'canceled' | 'expired' | 'past_due'
  current_period_end  timestamptz,                        -- when paid access expires
  trial_ends_at       timestamptz,                        -- when trial expires
  trial_used          boolean not null default false,     -- has the 7-day trial been consumed?
  teacher_code        text,                               -- referral code that granted an extended trial
  asaas_payment_id    text,
  asaas_customer_id   text,
  asaas_subscription_id text,    -- Asaas subscription id (recorrência com cartão)
  updated_at          timestamptz default now()
);

alter table public.subscriptions enable row level security;

-- Users can read their own subscription (so the client paywall works).
drop policy if exists "subs_select_own" on public.subscriptions;
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- NOTE: no insert/update policy here. All writes go through the service role
-- (in /api functions), which bypasses RLS. Users must NOT be able to flip
-- their own plan to 'pro' — that would defeat the paywall.

-- ── 3. teacher_codes: referral codes from singing teachers ──
create table if not exists public.teacher_codes (
  code           text primary key,
  teacher_name   text,
  teacher_email  text,
  -- 30-day trial granted when a student redeems the code (escopo seção 4).
  trial_days     integer not null default 30,
  max_uses       integer,            -- null = unlimited
  uses           integer not null default 0,
  created_at     timestamptz default now()
);

alter table public.teacher_codes enable row level security;
-- Codes are managed only by the service role (admin). No public read so they
-- can't be enumerated/scraped (escopo seção 4: "sem lista pública").

-- ── 4. payment_events: audit log of Asaas payments (idempotency + history) ──
create table if not exists public.payment_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  asaas_payment_id text,                                 -- NOT unique: a payment yields multiple events (created + received)
  plan            text,
  amount          numeric,
  status          text,                                  -- Asaas payment status
  event_type      text,                                  -- 'CHECKOUT_CREATED' | 'PAYMENT_RECEIVED' | 'PAYMENT_CONFIRMED' | ...
  payload         jsonb,
  processed_at    timestamptz default now()
);

-- Dedupe index: at most one activation per payment when event_type='PAYMENT_RECEIVED'.
create unique index if not exists payment_events_received_uniq
  on public.payment_events (asaas_payment_id) where event_type = 'PAYMENT_RECEIVED';

alter table public.payment_events enable row level security;
-- Audit log: service-role writes only. No client read.

-- ── 5. updated_at trigger ──
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_subs_touch on public.subscriptions;
create trigger trg_subs_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ── 6. Auto-create a subscription row on signup (default trial available) ──
--    On first login we leave trial_used=false; the user activates the 7-day
--    trial explicitly via the Upgrade screen (escopo: trial is opt-in).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
  insert into public.subscriptions (user_id, plan, status, trial_used)
    values (new.id, 'free', 'expired', false)
    on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Done. After running, set up Asaas (see SETUP_MONETIZACAO.md) and the env
-- vars in Vercel. The /api functions use SUPABASE_SERVICE_ROLE_KEY to write
-- subscriptions/payment_events past RLS.
-- ─────────────────────────────────────────────────────────────────────────

-- ── Idempotent column additions (safe to re-run on existing tables) ──
alter table public.subscriptions add column if not exists asaas_subscription_id text;

-- ── 7. teachers and teacher_students ──
create table if not exists public.teachers (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  teacher_name text,
  updated_at  timestamptz default now()
);

alter table public.teachers enable row level security;
drop policy if exists "teachers_select_own" on public.teachers;
create policy "teachers_select_own" on public.teachers
  for select using (auth.uid() = id);

drop policy if exists "teachers_upsert_own" on public.teachers;
create policy "teachers_upsert_own" on public.teachers
  for insert with check (auth.uid() = id);

drop policy if exists "teachers_update_own" on public.teachers;
create policy "teachers_update_own" on public.teachers
  for update using (auth.uid() = id);

create table if not exists public.teacher_students (
  teacher_id uuid references public.teachers(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  teacher_code text references public.teacher_codes(code),
  created_at timestamptz default now()
);

alter table public.teacher_students enable row level security;
drop policy if exists "teacher_students_select_own" on public.teacher_students;
create policy "teacher_students_select_own" on public.teacher_students
  for select using (auth.uid() = student_id);

drop policy if exists "teacher_students_upsert_own" on public.teacher_students;
create policy "teacher_students_upsert_own" on public.teacher_students
  for insert with check (auth.uid() = student_id);

drop policy if exists "teacher_students_update_own" on public.teacher_students;
create policy "teacher_students_update_own" on public.teacher_students
  for update using (auth.uid() = student_id);

-- Indexes for code and teacher lookup
create index if not exists idx_teacher_codes_code on public.teacher_codes (code);
create index if not exists idx_teacher_codes_teacher_email on public.teacher_codes (teacher_email);
create index if not exists idx_teacher_students_teacher_id on public.teacher_students (teacher_id);
create index if not exists idx_teacher_students_student_id on public.teacher_students (student_id);
create index if not exists idx_teacher_students_teacher_code on public.teacher_students (teacher_code);
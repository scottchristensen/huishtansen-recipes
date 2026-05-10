-- Weekly meal plans + reminders
-- Run this in Supabase SQL Editor

-- ─────────────────────────────────────────────────────────────────
-- 1. Scope meal plans to a week. Old weeks stay in DB but are
--    filtered out by app queries — natural reset every Monday.
-- ─────────────────────────────────────────────────────────────────

alter table meal_plans
  add column if not exists week_start date;

-- Backfill existing rows to the current week's Monday so live data
-- doesn't disappear when this migration runs.
update meal_plans
  set week_start = (current_date - ((extract(isodow from current_date)::int - 1) || ' days')::interval)::date
  where week_start is null;

create index if not exists meal_plans_week_planner_idx
  on meal_plans (week_start, planner);

-- ─────────────────────────────────────────────────────────────────
-- 2. Reminder preferences (Resend job will read this table)
-- ─────────────────────────────────────────────────────────────────

create table if not exists meal_plan_reminders (
  id uuid primary key default gen_random_uuid(),
  planner text not null unique,
  email text not null,
  day_of_week int not null default 0,    -- 0=Sun, 1=Mon, …, 6=Sat
  time_of_day time not null default '19:00',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table meal_plan_reminders enable row level security;
create policy "Allow all access to meal_plan_reminders"
  on meal_plan_reminders for all using (true) with check (true);

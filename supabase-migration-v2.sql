-- V2: Social meal plans and chef profiles
-- Run this in Supabase SQL Editor after v1 migration

-- Add planner to meal_plans so we know whose plan it is
alter table meal_plans add column if not exists planner text not null default '';

-- Chef profiles table (optional overrides for display)
create table if not exists chef_profiles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  avatar_emoji text not null default '🍴',
  bio text not null default '',
  favorite_cuisine text not null default '',
  cooking_since text not null default '',
  created_at timestamptz not null default now()
);

alter table chef_profiles enable row level security;
create policy "Allow all access to chef_profiles" on chef_profiles for all using (true) with check (true);

-- Seed the known family chefs
insert into chef_profiles (name, avatar_emoji, bio, favorite_cuisine) values
  ('Olivia', '👩‍🍳', 'The recipe queen. Loves fresh salads and creative bowls.', 'Mediterranean'),
  ('Darcey', '👩', 'Mom classics and slow cooker magic.', 'Comfort Food'),
  ('Annika', '🧑‍🍳', 'Baker extraordinaire. Granola, cookies, and cakes.', 'Baking'),
  ('Emma', '👧', 'Bringing the butter cake energy.', 'Desserts'),
  ('Isabel', '👶', 'Acai bowl specialist.', 'Smoothie Bowls'),
  ('Scott', '👨‍🍳', 'The app builder who also cooks sometimes.', 'Whatever looks good')
on conflict (name) do nothing;

-- Activity log for fun social stats
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  action text not null, -- 'added_recipe', 'tried_recipe', 'created_remix', 'planned_meal'
  recipe_id uuid references recipes(id) on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;
create policy "Allow all access to activity_log" on activity_log for all using (true) with check (true);

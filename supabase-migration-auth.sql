-- Huish Family Recipes - Auth Migration
-- Run this in the Supabase SQL Editor AFTER enabling Google Auth provider
-- (Dashboard > Authentication > Providers > Google)

-- Profiles table: maps Supabase auth users to family chef names
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  chef_name text not null,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Users can read all profiles (family app)
create policy "Anyone can read profiles" on profiles
  for select using (true);

-- Users can insert their own profile
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Update RLS policies on existing tables to require authentication
-- (replaces the old "allow all" policies)

-- Recipes: authenticated users only
drop policy if exists "Allow all access to recipes" on recipes;
create policy "Authenticated access to recipes" on recipes
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Recipe photos: authenticated users only
drop policy if exists "Allow all access to recipe_photos" on recipe_photos;
create policy "Authenticated access to recipe_photos" on recipe_photos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Meal plans: authenticated users only
drop policy if exists "Allow all access to meal_plans" on meal_plans;
create policy "Authenticated access to meal_plans" on meal_plans
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

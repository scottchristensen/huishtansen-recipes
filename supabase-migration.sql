-- Huish Family Recipes - Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Recipes table
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Main Course',
  chef text not null,
  difficulty text not null default 'Easy' check (difficulty in ('Easy', 'Medium', 'Hard')),
  time text not null default '',
  servings text not null default '',
  photo text not null default '',
  instructions text not null default '',
  ingredients text not null default '',
  link text not null default '',
  tags text[] not null default '{}',
  status text not null default 'want-to-try' check (status in ('family-approved', 'want-to-try')),
  notes text not null default '',
  remix_of uuid references recipes(id) on delete set null,
  remix_label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Recipe photos (attempt photos)
create table if not exists recipe_photos (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Meal plans
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  day text not null,
  recipe_id uuid not null references recipes(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table recipes enable row level security;
alter table recipe_photos enable row level security;
alter table meal_plans enable row level security;

-- Allow all operations for anyone with the anon key (family app, no per-user auth needed)
create policy "Allow all access to recipes" on recipes for all using (true) with check (true);
create policy "Allow all access to recipe_photos" on recipe_photos for all using (true) with check (true);
create policy "Allow all access to meal_plans" on meal_plans for all using (true) with check (true);

-- Create a storage bucket for recipe photos
insert into storage.buckets (id, name, public) values ('recipe-photos', 'recipe-photos', true)
on conflict do nothing;

-- Allow public access to recipe photos bucket
create policy "Public read access" on storage.objects for select using (bucket_id = 'recipe-photos');
create policy "Allow uploads" on storage.objects for insert with check (bucket_id = 'recipe-photos');
create policy "Allow deletes" on storage.objects for delete using (bucket_id = 'recipe-photos');

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();

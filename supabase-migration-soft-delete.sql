-- Soft delete for recipes
-- Run this in Supabase SQL Editor

-- Add deleted_at column
alter table recipes add column if not exists deleted_at timestamptz;

-- Index so non-deleted queries are fast
create index if not exists recipes_deleted_at_idx on recipes (deleted_at) where deleted_at is null;

-- ─────────────────────────────────────────────────────────────────
-- HOW TO RECOVER A DELETED RECIPE
-- ─────────────────────────────────────────────────────────────────
-- See what's been deleted (most recent first):
--   select id, name, chef, deleted_at from recipes
--     where deleted_at is not null order by deleted_at desc;
--
-- Restore one by id:
--   update recipes set deleted_at = null where id = '<uuid>';
--
-- Restore everything deleted in the last hour:
--   update recipes set deleted_at = null
--     where deleted_at > now() - interval '1 hour';
--
-- Permanently purge soft-deleted rows older than 30 days:
--   delete from recipes
--     where deleted_at is not null and deleted_at < now() - interval '30 days';
-- ─────────────────────────────────────────────────────────────────

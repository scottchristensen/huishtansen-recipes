-- Add meal_slot to meal_plans so each entry knows whether it's
-- breakfast/lunch/dinner. Without this, addToMealPlan silently fails.
-- Run this in Supabase SQL Editor.

alter table meal_plans
  add column if not exists meal_slot text not null default 'dinner';

create index if not exists meal_plans_week_slot_idx
  on meal_plans (week_start, planner, meal_slot);

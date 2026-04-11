"use client";

import { supabase } from "./supabase";

export interface MealPlanEntry {
  id: string;
  day: string;
  recipe_id: string;
  sort_order: number;
}

export interface MealPlanDay {
  day: string;
  recipeIds: string[];
}

export type MealPlan = MealPlanDay[];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function getEmptyMealPlan(): MealPlan {
  return DAYS.map((day) => ({ day, recipeIds: [] }));
}

export async function getMealPlan(): Promise<MealPlan> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .order("sort_order");

  if (error || !data) return getEmptyMealPlan();

  const plan = getEmptyMealPlan();
  for (const entry of data) {
    const dayPlan = plan.find((d) => d.day === entry.day);
    if (dayPlan) {
      dayPlan.recipeIds.push(entry.recipe_id);
    }
  }
  return plan;
}

export async function addToMealPlan(
  day: string,
  recipeId: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("meal_plans")
    .select("sort_order")
    .eq("day", day)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  await supabase
    .from("meal_plans")
    .insert({ day, recipe_id: recipeId, sort_order: nextOrder });
}

export async function removeFromMealPlan(
  day: string,
  recipeId: string
): Promise<void> {
  // Remove first occurrence
  const { data } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("day", day)
    .eq("recipe_id", recipeId)
    .limit(1);

  if (data && data.length > 0) {
    await supabase.from("meal_plans").delete().eq("id", data[0].id);
  }
}

export async function clearMealPlan(): Promise<void> {
  await supabase.from("meal_plans").delete().gte("id", "00000000-0000-0000-0000-000000000000");
}

export interface GroceryItem {
  text: string;
  checked: boolean;
}

export function generateGroceryList(
  ingredientStrings: string[]
): GroceryItem[] {
  const allLines: string[] = [];

  for (const str of ingredientStrings) {
    const lines = str
      .split(/\n|(?:,\s*(?=\d))|(?:,\s*(?=[A-Z]))/g)
      .map((l) => l.trim())
      .filter((l) => l.length > 2)
      .filter(
        (l) =>
          !l.match(
            /^(dressing|salad|sauce|topping|bowl|kabob|cake|marinade|veggie|chickpea|acai|polenta|chicken|for the|salmon)s?:?\s*$/i
          )
      );
    allLines.push(...lines);
  }

  const seen = new Set<string>();
  const items: GroceryItem[] = [];

  for (const line of allLines) {
    const normalized = line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (normalized.length < 3) continue;

    const key = normalized.replace(/\d+/g, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ text: line.replace(/^[-•*]\s*/, ""), checked: false });
  }

  return items;
}

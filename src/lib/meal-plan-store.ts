"use client";

import { supabase } from "./supabase";

export type MealSlot = "breakfast" | "lunch" | "dinner";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner"];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const SLOT_ICON: Record<MealSlot, string> = {
  breakfast: "🥞",
  lunch: "🥪",
  dinner: "🍝",
};

export interface SlotEntries {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

export interface MealPlanDay {
  day: string;
  slots: SlotEntries;
  recipeIds: string[];
}

export type MealPlan = MealPlanDay[];

export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const CURRENT_USER_KEY = "huish-current-user";
const PENDING_PLAN_KEY = "huish-pending-meal-plan";

// Recipes the user just multi-selected from the recipes table and wants to
// drop onto the meal plan kanban. Lives in sessionStorage so it survives
// the navigation but doesn't leak across tabs/sessions.
export function getPendingMealPlanRecipes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(PENDING_PLAN_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function setPendingMealPlanRecipes(ids: string[]): void {
  if (typeof window === "undefined") return;
  if (ids.length === 0) {
    sessionStorage.removeItem(PENDING_PLAN_KEY);
  } else {
    sessionStorage.setItem(PENDING_PLAN_KEY, JSON.stringify(ids));
  }
}

export function getCurrentUser(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CURRENT_USER_KEY) || "";
}

export function setCurrentUser(name: string): void {
  localStorage.setItem(CURRENT_USER_KEY, name);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("huish:auth-change"));
  }
}

// Returns the Monday of the current week as YYYY-MM-DD (local time).
// The week rolls over Sunday at 5pm — implemented by shifting "now" forward
// by 7 hours, so Sun 17:00 maps to Mon 00:00 and the next week's Monday wins.
const WEEK_ROLLOVER_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getCurrentWeekStart(reference: Date = new Date()): string {
  const shifted = new Date(reference.getTime() + WEEK_ROLLOVER_OFFSET_MS);
  const day = shifted.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(shifted);
  monday.setDate(shifted.getDate() + offsetToMonday);
  monday.setHours(0, 0, 0, 0);
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekRange(weekStart: string): { start: Date; end: Date } {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function emptyDay(day: string): MealPlanDay {
  return {
    day,
    slots: { breakfast: [], lunch: [], dinner: [] },
    recipeIds: [],
  };
}

export function getEmptyMealPlan(): MealPlan {
  return DAYS.map(emptyDay);
}

function normalizeSlot(value: unknown): MealSlot {
  if (value === "breakfast" || value === "lunch" || value === "dinner") {
    return value;
  }
  return "dinner";
}

export async function getMealPlan(planner: string): Promise<MealPlan> {
  if (!planner) return getEmptyMealPlan();

  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("planner", planner)
    .eq("week_start", getCurrentWeekStart())
    .order("sort_order");

  if (error || !data) return getEmptyMealPlan();

  const plan = getEmptyMealPlan();
  for (const entry of data) {
    const dayPlan = plan.find((d) => d.day === entry.day);
    if (!dayPlan) continue;
    const slot = normalizeSlot(entry.meal_slot);
    dayPlan.slots[slot].push(entry.recipe_id);
    dayPlan.recipeIds.push(entry.recipe_id);
  }
  return plan;
}

export async function getAllMealPlans(): Promise<
  { planner: string; plan: MealPlan }[]
> {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("week_start", getCurrentWeekStart())
    .order("sort_order");

  if (error || !data || data.length === 0) return [];

  const planners = [...new Set(data.map((d) => d.planner).filter(Boolean))];

  return planners.map((planner) => {
    const plan = getEmptyMealPlan();
    for (const entry of data.filter((d) => d.planner === planner)) {
      const dayPlan = plan.find((d) => d.day === entry.day);
      if (!dayPlan) continue;
      const slot = normalizeSlot(entry.meal_slot);
      dayPlan.slots[slot].push(entry.recipe_id);
      dayPlan.recipeIds.push(entry.recipe_id);
    }
    return { planner, plan };
  });
}

export interface MealPlanWriteResult {
  ok: boolean;
  error?: string;
}

export async function addToMealPlan(
  day: string,
  recipeId: string,
  planner: string,
  slot: MealSlot = "dinner"
): Promise<MealPlanWriteResult> {
  if (!planner) {
    return { ok: false, error: "No planner set. Pick your name first." };
  }
  const weekStart = getCurrentWeekStart();
  const { data: existing } = await supabase
    .from("meal_plans")
    .select("sort_order")
    .eq("day", day)
    .eq("planner", planner)
    .eq("week_start", weekStart)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { error } = await supabase.from("meal_plans").insert({
    day,
    recipe_id: recipeId,
    sort_order: nextOrder,
    planner,
    meal_slot: slot,
    week_start: weekStart,
  });

  if (error) {
    console.error("addToMealPlan failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function removeFromMealPlan(
  day: string,
  recipeId: string,
  planner: string,
  slot?: MealSlot
): Promise<MealPlanWriteResult> {
  let query = supabase
    .from("meal_plans")
    .select("id")
    .eq("day", day)
    .eq("recipe_id", recipeId)
    .eq("planner", planner)
    .eq("week_start", getCurrentWeekStart());
  if (slot) query = query.eq("meal_slot", slot);

  const { data, error: selectErr } = await query.limit(1);
  if (selectErr) {
    console.error("removeFromMealPlan select failed:", selectErr);
    return { ok: false, error: selectErr.message };
  }

  if (data && data.length > 0) {
    const { error } = await supabase
      .from("meal_plans")
      .delete()
      .eq("id", data[0].id);
    if (error) {
      console.error("removeFromMealPlan delete failed:", error);
      return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

export async function clearMealPlan(planner: string): Promise<void> {
  // Only clears the current week — past weeks stay in history.
  await supabase
    .from("meal_plans")
    .delete()
    .eq("planner", planner)
    .eq("week_start", getCurrentWeekStart());
}

// ─────────────────────────────────────────────────────────────────
// Reminders (Resend job will read meal_plan_reminders)
// ─────────────────────────────────────────────────────────────────

export interface ReminderPrefs {
  planner: string;
  email: string;
  day_of_week: number; // 0 = Sun, …, 6 = Sat
  time_of_day: string; // "HH:MM" or "HH:MM:SS"
  enabled: boolean;
}

export async function getReminder(
  planner: string
): Promise<ReminderPrefs | null> {
  if (!planner) return null;
  const { data } = await supabase
    .from("meal_plan_reminders")
    .select("planner, email, day_of_week, time_of_day, enabled")
    .eq("planner", planner)
    .maybeSingle();
  return data ?? null;
}

export async function saveReminder(prefs: ReminderPrefs): Promise<boolean> {
  const { error } = await supabase.from("meal_plan_reminders").upsert(
    {
      ...prefs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "planner" }
  );
  if (error) {
    console.error("Error saving reminder:", error);
    return false;
  }
  return true;
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

export function suggestForSlot(
  recipes: { id: string; name: string; type: string; chef: string; time: string }[],
  slot: MealSlot,
  plannedRecipeIds: string[],
  plannedChefCounts: Record<string, number>,
  plannedTypeCounts: Record<string, number>,
  limit = 6
) {
  const planned = new Set(plannedRecipeIds);

  const slotMatches = (type: string) => {
    if (slot === "breakfast") return type === "Breakfast";
    if (slot === "lunch")
      return ["Salad", "Main Course", "Side Dish", "Appetizers/Snacks"].includes(
        type
      );
    return ["Main Course", "Salad", "Side Dish"].includes(type);
  };

  return recipes
    .filter((r) => !planned.has(r.id))
    .filter((r) => slotMatches(r.type))
    .map((r) => {
      const chefPenalty = (plannedChefCounts[r.chef] || 0) * 2;
      const typePenalty = plannedTypeCounts[r.type] || 0;
      return { recipe: r, score: -(chefPenalty + typePenalty) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.recipe);
}

"use client";

const MEAL_PLAN_KEY = "huish-meal-plan";

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

export function getMealPlan(): MealPlan {
  if (typeof window === "undefined") return getEmptyMealPlan();

  const stored = localStorage.getItem(MEAL_PLAN_KEY);
  if (!stored) return getEmptyMealPlan();

  try {
    return JSON.parse(stored);
  } catch {
    return getEmptyMealPlan();
  }
}

export function saveMealPlan(plan: MealPlan): void {
  localStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(plan));
}

export function clearMealPlan(): void {
  localStorage.removeItem(MEAL_PLAN_KEY);
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
    // Split on newlines, commas that separate distinct ingredients, or sentence-like boundaries
    const lines = str
      .split(/\n|(?:,\s*(?=\d))|(?:,\s*(?=[A-Z]))/g)
      .map((l) => l.trim())
      .filter((l) => l.length > 2)
      // Filter out section headers and non-ingredient lines
      .filter(
        (l) =>
          !l.match(
            /^(dressing|salad|sauce|topping|bowl|kabob|cake|marinade|veggie|chickpea|acai|polenta|chicken|for the|salmon)s?:?\s*$/i
          )
      );
    allLines.push(...lines);
  }

  // Deduplicate similar items (basic)
  const seen = new Set<string>();
  const items: GroceryItem[] = [];

  for (const line of allLines) {
    const normalized = line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (normalized.length < 3) continue;

    // Skip if we've already seen something very similar
    const key = normalized.replace(/\d+/g, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ text: line.replace(/^[-•*]\s*/, ""), checked: false });
  }

  return items;
}

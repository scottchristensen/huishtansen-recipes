"use client";

// Per-recipe scale factor, persisted to sessionStorage so it stays consistent
// across recipe detail, cook mode, and grocery list within one tab session
// but doesn't follow the user into a new browser session.

const KEY_PREFIX = "huish-recipe-scale:";
export const RECIPE_SCALE_EVENT = "huish:recipe-scale-change";

function key(recipeId: string) {
  return `${KEY_PREFIX}${recipeId}`;
}

export function getRecipeScale(recipeId: string): number {
  if (typeof window === "undefined") return 1;
  try {
    const raw = sessionStorage.getItem(key(recipeId));
    if (!raw) return 1;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}

export function setRecipeScale(recipeId: string, scale: number): void {
  if (typeof window === "undefined") return;
  try {
    if (!Number.isFinite(scale) || scale <= 0 || scale === 1) {
      sessionStorage.removeItem(key(recipeId));
    } else {
      sessionStorage.setItem(key(recipeId), String(scale));
    }
    window.dispatchEvent(
      new CustomEvent(RECIPE_SCALE_EVENT, { detail: { recipeId, scale } })
    );
  } catch {
    // sessionStorage unavailable — best effort, no-op.
  }
}

// Read scales for many recipes at once (used by the grocery aggregator).
export function getRecipeScales(recipeIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of recipeIds) out[id] = getRecipeScale(id);
  return out;
}

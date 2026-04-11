"use client";

import { Recipe } from "./types";
import { seedRecipes } from "./seed-recipes";

const STORAGE_KEY = "huish-recipes";
const AUTH_KEY = "huish-auth";
const FAMILY_PIN = "huish2026";

export function getRecipes(): Recipe[] {
  if (typeof window === "undefined") return seedRecipes;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRecipes));
    return seedRecipes;
  }
  return JSON.parse(stored);
}

export function getRecipe(id: string): Recipe | undefined {
  return getRecipes().find((r) => r.id === id);
}

export function saveRecipe(recipe: Recipe): void {
  const recipes = getRecipes();
  const index = recipes.findIndex((r) => r.id === recipe.id);
  if (index >= 0) {
    recipes[index] = recipe;
  } else {
    recipes.push(recipe);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function deleteRecipe(id: string): void {
  const recipes = getRecipes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function getUniqueChefs(recipes: Recipe[]): string[] {
  return [...new Set(recipes.map((r) => r.chef))].sort();
}

export function getUniqueTypes(recipes: Recipe[]): string[] {
  return [...new Set(recipes.map((r) => r.type))].sort();
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function authenticate(pin: string): boolean {
  if (pin === FAMILY_PIN) {
    localStorage.setItem(AUTH_KEY, "true");
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function parseTimeMinutes(time: string): number | null {
  const match = time.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1]);
}

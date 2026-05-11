"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Recipe, FilterState } from "@/lib/types";
import {
  getRecipes,
  getUniqueChefs,
  getUniqueTypes,
  parseTimeMinutes,
} from "@/lib/recipes-store";
import RecipeCard from "@/components/RecipeCard";
import RecipeTable from "@/components/RecipeTable";
import SelectionActionBar from "@/components/SelectionActionBar";
import FilterBar from "@/components/FilterBar";
import AuthGate from "@/components/AuthGate";
import AddRecipeButton from "@/components/AddRecipeButton";

const VIEW_KEY = "huish-recipe-view";
type View = "tile" | "table";

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("table");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    chef: "",
    type: "",
    difficulty: "",
    status: "",
    maxTime: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "table" || saved === "tile") setView(saved);
  }, []);

  const switchView = (next: View) => {
    setView(next);
    localStorage.setItem(VIEW_KEY, next);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadRecipes = useCallback(async () => {
    const data = await getRecipes();
    setRecipes(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const chefs = useMemo(() => getUniqueChefs(recipes), [recipes]);
  const types = useMemo(() => getUniqueTypes(recipes), [recipes]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const allFilteredSelected =
        filtered.length > 0 && filtered.every((r) => prev.has(r.id));
      if (allFilteredSelected) return new Set();
      return new Set(filtered.map((r) => r.id));
    });
  };

  const selectedRecipes = useMemo(
    () => recipes.filter((r) => selectedIds.has(r.id)),
    [recipes, selectedIds]
  );

  const filtered = useMemo(() => {
    const terms = filters.search
      .toLowerCase()
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    return recipes.filter((recipe) => {
      if (terms.length > 0) {
        const haystack = [
          recipe.name,
          recipe.ingredients,
          recipe.chef,
          recipe.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      if (filters.chef && recipe.chef !== filters.chef) return false;
      if (filters.type && recipe.type !== filters.type) return false;
      if (filters.difficulty && recipe.difficulty !== filters.difficulty)
        return false;
      if (filters.status && recipe.status !== filters.status) return false;
      if (filters.maxTime) {
        const mins = parseTimeMinutes(recipe.time);
        if (mins === null || mins > parseInt(filters.maxTime)) return false;
      }
      return true;
    });
  }, [recipes, filters]);

  return (
    <AuthGate>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Recipes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Browse, search, and add to your meal plan
            </p>
          </div>
          <AddRecipeButton />
        </div>

        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          chefs={chefs}
          types={types}
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading
              ? "Loading..."
              : `${filtered.length} recipe${filtered.length !== 1 ? "s" : ""}`}
          </p>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
            <button
              onClick={() => switchView("tile")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                view === "tile"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              title="Tile view"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Tile
            </button>
            <button
              onClick={() => switchView("table")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                view === "table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
              title="Table view"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              Table
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-500 dark:text-slate-400 text-lg">No recipes found</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : view === "tile" ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <RecipeTable
            recipes={filtered}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        )}

        {selectedRecipes.length > 0 && (
          <SelectionActionBar
            selectedRecipes={selectedRecipes}
            onClear={() => setSelectedIds(new Set())}
            onActionComplete={() => {
              setSelectedIds(new Set());
              loadRecipes();
            }}
          />
        )}
      </div>
    </AuthGate>
  );
}

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
import FilterBar from "@/components/FilterBar";
import AuthGate from "@/components/AuthGate";
import IngredientSearch from "@/components/IngredientSearch";

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    chef: "",
    type: "",
    difficulty: "",
    status: "",
    maxTime: "",
  });

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

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      const searchLower = filters.search.toLowerCase();
      if (searchLower) {
        const matchesSearch =
          recipe.name.toLowerCase().includes(searchLower) ||
          recipe.ingredients.toLowerCase().includes(searchLower) ||
          recipe.chef.toLowerCase().includes(searchLower) ||
          recipe.tags.some((t) => t.includes(searchLower));
        if (!matchesSearch) return false;
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
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          chefs={chefs}
          types={types}
        />

        <IngredientSearch recipes={recipes} />

        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            {loading
              ? "Loading..."
              : `${filtered.length} recipe${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-stone-500 text-lg">No recipes found</p>
            <p className="text-stone-400 text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

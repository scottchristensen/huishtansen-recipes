"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Recipe } from "@/lib/types";
import { getRecipes } from "@/lib/recipes-store";
import {
  MealPlan,
  getMealPlan,
  addToMealPlan,
  removeFromMealPlan,
  clearMealPlan,
  getEmptyMealPlan,
  generateGroceryList,
  GroceryItem,
} from "@/lib/meal-plan-store";
import AuthGate from "@/components/AuthGate";

export default function MealPlanPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plan, setPlan] = useState<MealPlan>(getEmptyMealPlan());
  const [loading, setLoading] = useState(true);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    const [recipesData, planData] = await Promise.all([
      getRecipes(),
      getMealPlan(),
    ]);
    setRecipes(recipesData);
    setPlan(planData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.chef.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  const handleAddRecipe = async (day: string, recipeId: string) => {
    await addToMealPlan(day, recipeId);
    setPlan(await getMealPlan());
    setAddingToDay(null);
    setSearchQuery("");
  };

  const handleRemoveRecipe = async (day: string, recipeId: string) => {
    await removeFromMealPlan(day, recipeId);
    setPlan(await getMealPlan());
  };

  const handleClearPlan = async () => {
    await clearMealPlan();
    setPlan(getEmptyMealPlan());
    setShowGroceryList(false);
  };

  const handleGenerateGroceryList = () => {
    const allRecipeIds = plan.flatMap((d) => d.recipeIds);
    const uniqueIds = [...new Set(allRecipeIds)];
    const ingredientStrings = uniqueIds
      .map((id) => recipesById.get(id)?.ingredients || "")
      .filter(Boolean);

    const items = generateGroceryList(ingredientStrings);
    setGroceryItems(items);
    setShowGroceryList(true);
  };

  const toggleGroceryItem = (index: number) => {
    setGroceryItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const totalMeals = plan.reduce((sum, d) => sum + d.recipeIds.length, 0);

  if (loading) {
    return (
      <AuthGate>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Meal Plan</h1>
            <p className="text-sm text-stone-500 mt-1">Pick recipes for the week, then generate your grocery list</p>
          </div>
          <div className="flex gap-2">
            {totalMeals > 0 && (
              <>
                <button onClick={handleGenerateGroceryList} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors">Grocery List</button>
                <button onClick={handleClearPlan} className="px-4 py-2 border border-stone-200 text-stone-500 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors">Clear</button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {plan.map((day) => (
            <div key={day.day} className="bg-white rounded-xl border border-amber-100 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
                <h3 className="font-semibold text-stone-800 text-sm">{day.day}</h3>
                <button onClick={() => setAddingToDay(addingToDay === day.day ? null : day.day)} className="text-amber-600 hover:text-amber-800 text-sm font-medium">
                  {addingToDay === day.day ? "Cancel" : "+ Add"}
                </button>
              </div>

              <div className="p-3">
                {day.recipeIds.length === 0 && addingToDay !== day.day && (
                  <p className="text-sm text-stone-300 text-center py-2">No meals planned</p>
                )}

                {day.recipeIds.map((id, idx) => {
                  const recipe = recipesById.get(id);
                  if (!recipe) return null;
                  return (
                    <div key={`${id}-${idx}`} className="flex items-center justify-between py-2 px-1 group">
                      <a href={`/recipe/${recipe.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 overflow-hidden shrink-0">
                          {recipe.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={recipe.photo} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">🍽️</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{recipe.name}</p>
                          <p className="text-xs text-stone-400">{recipe.time} · {recipe.chef}</p>
                        </div>
                      </a>
                      <button onClick={() => handleRemoveRecipe(day.day, id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}

                {addingToDay === day.day && (
                  <div className="mt-2 space-y-2">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search recipes..." autoFocus className="w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredRecipes.slice(0, 10).map((recipe) => (
                        <button key={recipe.id} onClick={() => handleAddRecipe(day.day, recipe.id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-2">
                          <span className="text-sm text-stone-700 truncate flex-1">{recipe.name}</span>
                          <span className="text-xs text-stone-400 shrink-0">{recipe.time}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {showGroceryList && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Grocery List</h2>
                  <p className="text-xs text-stone-400">{groceryItems.filter((i) => !i.checked).length} items remaining</p>
                </div>
                <button onClick={() => setShowGroceryList(false)} className="text-stone-400 hover:text-stone-600 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-3">
                {groceryItems.length === 0 ? (
                  <p className="text-center text-stone-400 py-8">No ingredients to list</p>
                ) : (
                  <div className="space-y-1">
                    {groceryItems.map((item, i) => (
                      <button key={i} onClick={() => toggleGroceryItem(i)} className="w-full text-left flex items-start gap-3 py-2 px-1 rounded-lg hover:bg-amber-50 transition-colors">
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${item.checked ? "bg-green-500 border-green-500 text-white" : "border-stone-300"}`}>
                          {item.checked && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm ${item.checked ? "text-stone-400 line-through" : "text-stone-700"}`}>{item.text}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-amber-100 shrink-0">
                <button
                  onClick={() => {
                    const unchecked = groceryItems.filter((i) => !i.checked).map((i) => i.text).join("\n");
                    navigator.clipboard.writeText(unchecked);
                  }}
                  className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

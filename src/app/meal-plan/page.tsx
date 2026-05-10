"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Recipe } from "@/lib/types";
import { getRecipes } from "@/lib/recipes-store";
import {
  MealPlan,
  MealSlot,
  MEAL_SLOTS,
  SLOT_LABEL,
  SLOT_ICON,
  getMealPlan,
  getAllMealPlans,
  addToMealPlan,
  removeFromMealPlan,
  clearMealPlan,
  getEmptyMealPlan,
  getCurrentUser,
  setCurrentUser,
  getCurrentWeekStart,
  getWeekRange,
  getReminder,
  generateGroceryList,
  suggestForSlot,
  GroceryItem,
  getPendingMealPlanRecipes,
  setPendingMealPlanRecipes,
} from "@/lib/meal-plan-store";
import { useAuth } from "@/lib/auth-context";
import AuthGate from "@/components/AuthGate";
import ChefAvatar from "@/components/ChefAvatar";
import MealPlanReminderModal from "@/components/MealPlanReminderModal";
import MealPlanKanban, {
  PendingTray,
  SuggestionsTray,
  type KanbanLayout,
} from "@/components/MealPlanKanban";

const LAYOUT_KEY = "huish-meal-plan-layout";

type AddingTarget = { day: string; slot: MealSlot } | null;

export default function MealPlanPage() {
  const { profile, user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [myPlan, setMyPlan] = useState<MealPlan>(getEmptyMealPlan());
  const [allPlans, setAllPlans] = useState<
    { planner: string; plan: MealPlan }[]
  >([]);
  const [currentUser, setCurrentUserState] = useState("");
  const [loading, setLoading] = useState(true);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [adding, setAdding] = useState<AddingTarget>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"mine" | "family">("mine");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [planLayout, setPlanLayout] = useState<KanbanLayout>("kanban");

  // Pull recipes the user multi-selected from the recipes table + restore
  // the user's preferred layout.
  useEffect(() => {
    setPendingIds(getPendingMealPlanRecipes());
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved === "kanban" || saved === "list") setPlanLayout(saved);
  }, []);

  const switchLayout = (next: KanbanLayout) => {
    setPlanLayout(next);
    localStorage.setItem(LAYOUT_KEY, next);
  };

  const weekStart = useMemo(() => getCurrentWeekStart(), []);
  const weekRange = useMemo(() => {
    const { start, end } = getWeekRange(weekStart);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [weekStart]);

  const loadData = useCallback(async (planner: string) => {
    const [recipesData, myPlanData, allPlansData] = await Promise.all([
      getRecipes(),
      planner ? getMealPlan(planner) : Promise.resolve(getEmptyMealPlan()),
      getAllMealPlans(),
    ]);
    setRecipes(recipesData);
    setMyPlan(myPlanData);
    setAllPlans(allPlansData);
    setLoading(false);
  }, []);

  // Resolve planner from auth profile, falling back to legacy localStorage
  // value (used in QA bypass mode before SSO is wired up).
  useEffect(() => {
    const planner = profile?.chef_name || getCurrentUser();
    setCurrentUserState(planner);
    if (planner) setCurrentUser(planner);
    loadData(planner);
  }, [profile, loadData]);

  useEffect(() => {
    if (!currentUser) {
      setReminderEnabled(false);
      return;
    }
    getReminder(currentUser).then((r) => setReminderEnabled(!!r?.enabled));
  }, [currentUser]);

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    recipes.forEach((r) => map.set(r.id, r));
    return map;
  }, [recipes]);

  const plannedRecipeIds = useMemo(
    () => myPlan.flatMap((d) => d.recipeIds),
    [myPlan]
  );

  const { plannedChefCounts, plannedTypeCounts } = useMemo(() => {
    const chefs: Record<string, number> = {};
    const types: Record<string, number> = {};
    for (const id of plannedRecipeIds) {
      const r = recipesById.get(id);
      if (!r) continue;
      chefs[r.chef] = (chefs[r.chef] || 0) + 1;
      types[r.type] = (types[r.type] || 0) + 1;
    }
    return { plannedChefCounts: chefs, plannedTypeCounts: types };
  }, [plannedRecipeIds, recipesById]);

  const suggestions = useMemo(() => {
    if (recipes.length === 0) return [];
    const planned = new Set(plannedRecipeIds);
    const candidates = recipes.filter((r) => !planned.has(r.id));
    return candidates
      .map((r) => {
        const chefPenalty = (plannedChefCounts[r.chef] || 0) * 2;
        const typePenalty = plannedTypeCounts[r.type] || 0;
        return { recipe: r, score: -(chefPenalty + typePenalty) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.recipe);
  }, [recipes, plannedRecipeIds, plannedChefCounts, plannedTypeCounts]);

  const pendingRecipes = useMemo(
    () =>
      pendingIds
        .map((id) => recipesById.get(id))
        .filter((r): r is Recipe => Boolean(r)),
    [pendingIds, recipesById]
  );

  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.chef.toLowerCase().includes(q) ||
        r.ingredients.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  const handleAddRecipe = async (
    day: string,
    slot: MealSlot,
    recipeId: string
  ) => {
    if (!currentUser) return;
    await addToMealPlan(day, recipeId, currentUser, slot);
    const [plan, all] = await Promise.all([
      getMealPlan(currentUser),
      getAllMealPlans(),
    ]);
    setMyPlan(plan);
    setAllPlans(all);
    setAdding(null);
    setSearchQuery("");
  };

  const handleRemoveRecipe = async (
    day: string,
    slot: MealSlot,
    recipeId: string
  ) => {
    if (!currentUser) return;
    await removeFromMealPlan(day, recipeId, currentUser, slot);
    const [plan, all] = await Promise.all([
      getMealPlan(currentUser),
      getAllMealPlans(),
    ]);
    setMyPlan(plan);
    setAllPlans(all);
  };

  const removeFromPending = useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = prev.filter((p) => p !== id);
      setPendingMealPlanRecipes(next);
      return next;
    });
  }, []);

  const handleKanbanDrop = async (
    recipeId: string,
    target: { day: string; slot: MealSlot },
    source?: { day: string; slot: MealSlot }
  ) => {
    if (!currentUser) return;
    if (source) {
      // Move between slots: remove from origin, add to target.
      await removeFromMealPlan(source.day, recipeId, currentUser, source.slot);
    }
    await addToMealPlan(target.day, recipeId, currentUser, target.slot);
    if (!source) removeFromPending(recipeId);
    const [plan, all] = await Promise.all([
      getMealPlan(currentUser),
      getAllMealPlans(),
    ]);
    setMyPlan(plan);
    setAllPlans(all);
  };

  const handleClearPending = () => {
    setPendingIds([]);
    setPendingMealPlanRecipes([]);
  };

  const handleClearPlan = async () => {
    if (!currentUser) return;
    await clearMealPlan(currentUser);
    setMyPlan(getEmptyMealPlan());
    setAllPlans(await getAllMealPlans());
    setShowGroceryList(false);
  };

  const handleGenerateGroceryList = () => {
    const uniqueIds = [...new Set(plannedRecipeIds)];
    const ingredientStrings = uniqueIds
      .map((id) => recipesById.get(id)?.ingredients || "")
      .filter(Boolean);
    setGroceryItems(generateGroceryList(ingredientStrings));
    setShowGroceryList(true);
  };

  const toggleGroceryItem = (index: number) => {
    setGroceryItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const totalMeals = plannedRecipeIds.length;
  const otherPlans = allPlans.filter((p) => p.planner !== currentUser);

  if (loading) {
    return (
      <AuthGate>
        <div className="space-y-6">
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        </div>
      </AuthGate>
    );
  }

  const tabClasses = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      view === tab
        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
    }`;

  return (
    <AuthGate>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Meal Plan
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Week of {weekRange} — resets Sunday at 5pm
            </p>
          </div>
          {currentUser && (
            <button
              onClick={() => setShowReminderModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                reminderEnabled
                  ? "border-slate-300 dark:border-emerald-700 bg-slate-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {reminderEnabled ? "Reminder on" : "Set reminder"}
            </button>
          )}
        </div>

        {!currentUser ? (
          <div />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setView("mine")} className={tabClasses("mine")}>
                  My Plan
                </button>
                <button onClick={() => setView("family")} className={tabClasses("family")}>
                  Family
                  {otherPlans.length > 0 && (
                    <span className="ml-1.5 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">
                      {otherPlans.length}
                    </span>
                  )}
                </button>
              </div>
              {view === "mine" && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                    <button
                      onClick={() => switchLayout("kanban")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                        planLayout === "kanban"
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
                      }`}
                      title="Kanban view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v14H4zM10 6h4v14h-4zM16 6h4v14h-4z" />
                      </svg>
                      Kanban
                    </button>
                    <button
                      onClick={() => switchLayout("list")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                        planLayout === "list"
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400"
                      }`}
                      title="List view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      List
                    </button>
                  </div>
                  {totalMeals > 0 && (
                    <>
                      <button
                        onClick={handleGenerateGroceryList}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Grocery List
                      </button>
                      <button
                        onClick={handleClearPlan}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {view === "mine" && (
              <div className="space-y-4">
                {pendingRecipes.length > 0 ? (
                  <PendingTray
                    pending={pendingRecipes}
                    onClear={handleClearPending}
                    onRemove={removeFromPending}
                  />
                ) : (
                  <SuggestionsTray suggestions={suggestions} />
                )}
                {planLayout === "kanban" ? (
                  <div className="relative w-screen left-1/2 -translate-x-1/2 px-4">
                    <MealPlanKanban
                      plan={myPlan}
                      recipesById={recipesById}
                      layout="kanban"
                      onDrop={handleKanbanDrop}
                      onRemove={handleRemoveRecipe}
                      onAddClick={(day, slot) => {
                        setAdding({ day, slot });
                        setSearchQuery("");
                      }}
                    />
                  </div>
                ) : (
                  <MealPlanKanban
                    plan={myPlan}
                    recipesById={recipesById}
                    layout="list"
                    onDrop={handleKanbanDrop}
                    onRemove={handleRemoveRecipe}
                    onAddClick={(day, slot) => {
                      setAdding({ day, slot });
                      setSearchQuery("");
                    }}
                  />
                )}
              </div>
            )}

            {view === "family" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    See what everyone else is cooking this week
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Each family member&apos;s plan for the week of {weekRange}
                  </p>
                </div>
                {allPlans.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-3xl mb-2">👨‍👩‍👧‍👦</div>
                    <p className="text-slate-400 dark:text-slate-500">
                      No one has planned meals yet this week
                    </p>
                  </div>
                ) : (
                  allPlans.map(({ planner, plan }) => {
                    const plannedDays = plan.filter((d) => d.recipeIds.length > 0);
                    if (plannedDays.length === 0) return null;
                    return (
                      <div key={planner}>
                        <div className="flex items-center gap-2 mb-3">
                          <ChefAvatar name={planner} size="md" />
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {planner}
                            {planner === currentUser && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1">
                                (you)
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="space-y-2 ml-10">
                          {plannedDays.map((day) => (
                            <div
                              key={day.day}
                              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                            >
                              <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                                {day.day}
                              </h4>
                              {MEAL_SLOTS.map((slot) =>
                                day.slots[slot].length > 0 ? (
                                  <div key={slot} className="mb-1.5 last:mb-0">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                                      {SLOT_ICON[slot]} {SLOT_LABEL[slot]}
                                    </p>
                                    {day.slots[slot].map((id, idx) => {
                                      const recipe = recipesById.get(id);
                                      if (!recipe) return null;
                                      return (
                                        <a
                                          key={`${id}-${idx}`}
                                          href={`/recipe/${recipe.id}`}
                                          className="flex items-center gap-2 py-1 text-sm text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors ml-4"
                                        >
                                          <span>🍽️</span>
                                          {recipe.name}
                                        </a>
                                      );
                                    })}
                                  </div>
                                ) : null
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {adding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {adding.day}
                  </p>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1.5">
                    <span>{SLOT_ICON[adding.slot]}</span>
                    {SLOT_LABEL[adding.slot]}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setAdding(null);
                    setSearchQuery("");
                  }}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <SlotPicker
                slot={adding.slot}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredRecipes={filteredRecipes}
                allRecipes={recipes}
                plannedRecipeIds={plannedRecipeIds}
                plannedChefCounts={plannedChefCounts}
                plannedTypeCounts={plannedTypeCounts}
                onPick={(id) => handleAddRecipe(adding.day, adding.slot, id)}
              />
            </div>
          </div>
        )}

        {showReminderModal && (
          <MealPlanReminderModal
            planner={currentUser}
            defaultEmail={profile?.email || user?.email || ""}
            open={showReminderModal}
            onClose={() => {
              setShowReminderModal(false);
              if (currentUser) {
                getReminder(currentUser).then((r) =>
                  setReminderEnabled(!!r?.enabled)
                );
              }
            }}
          />
        )}

        {showGroceryList && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Grocery List
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {groceryItems.filter((i) => !i.checked).length} items remaining
                  </p>
                </div>
                <button
                  onClick={() => setShowGroceryList(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-3">
                {groceryItems.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-slate-500 py-8">
                    No ingredients to list
                  </p>
                ) : (
                  <div className="space-y-1">
                    {groceryItems.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => toggleGroceryItem(i)}
                        className="w-full text-left flex items-start gap-3 py-2 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            item.checked
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {item.checked && (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            item.checked
                              ? "text-slate-400 dark:text-slate-500 line-through"
                              : "text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => {
                    const unchecked = groceryItems
                      .filter((i) => !i.checked)
                      .map((i) => i.text)
                      .join("\n");
                    navigator.clipboard.writeText(unchecked);
                  }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors"
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

function SlotPicker({
  slot,
  searchQuery,
  setSearchQuery,
  filteredRecipes,
  allRecipes,
  plannedRecipeIds,
  plannedChefCounts,
  plannedTypeCounts,
  onPick,
}: {
  slot: MealSlot;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  filteredRecipes: Recipe[];
  allRecipes: Recipe[];
  plannedRecipeIds: string[];
  plannedChefCounts: Record<string, number>;
  plannedTypeCounts: Record<string, number>;
  onPick: (id: string) => void;
}) {
  const suggestions = useMemo(
    () => suggestForSlot(allRecipes, slot, plannedRecipeIds, plannedChefCounts, plannedTypeCounts, 4),
    [allRecipes, slot, plannedRecipeIds, plannedChefCounts, plannedTypeCounts]
  );

  return (
    <div className="mt-3 flex flex-col gap-3 flex-1 min-h-0">
      <div className="relative shrink-0">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search all recipes by name, chef, or ingredient…"
          autoFocus
          className="w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {!searchQuery && suggestions.length > 0 && (
        <div className="shrink-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Suggested for variety
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((r) => (
              <button
                key={r.id}
                onClick={() => onPick(r.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm">✨</span>
                <span className="truncate max-w-[160px]">{r.name}</span>
                <span className="text-slate-400 dark:text-slate-500">· {r.chef}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 -mx-1 px-1">
        {filteredRecipes.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
            No recipes match
          </p>
        ) : (
          filteredRecipes.slice(0, 30).map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onPick(recipe.id)}
              className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-md bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                {recipe.photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={recipe.photo}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base text-slate-400 dark:text-slate-500">
                    🍽️
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {recipe.name}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                  {recipe.chef} · {recipe.type}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}


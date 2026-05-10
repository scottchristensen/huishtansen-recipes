"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  suggestForSlot,
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
  const router = useRouter();
  const { profile, user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [myPlan, setMyPlan] = useState<MealPlan>(getEmptyMealPlan());
  const [allPlans, setAllPlans] = useState<
    { planner: string; plan: MealPlan }[]
  >([]);
  const [currentUser, setCurrentUserState] = useState("");
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [adding, setAdding] = useState<AddingTarget>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"mine" | "family">("mine");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [planLayout, setPlanLayout] = useState<KanbanLayout>("kanban");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 8000);
  }, []);

  // Pull recipes the user multi-selected from the recipes table + restore
  // the user's preferred layout.
  useEffect(() => {
    setPendingIds(getPendingMealPlanRecipes());
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved === "kanban" || saved === "list") {
      setPlanLayout(saved);
    } else if (typeof window !== "undefined" && window.innerWidth < 768) {
      setPlanLayout("kanban");
    }
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
    if (!currentUser) {
      showError("Pick your name in Meal Plan before adding recipes.");
      return;
    }
    const result = await addToMealPlan(day, recipeId, currentUser, slot);
    if (!result.ok) {
      showError(`Couldn't add: ${result.error || "unknown error"}`);
      return;
    }
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
    const result = await removeFromMealPlan(day, recipeId, currentUser, slot);
    if (!result.ok) {
      showError(`Couldn't remove: ${result.error || "unknown error"}`);
      return;
    }
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
    if (!currentUser) {
      showError("Pick your name in Meal Plan before adding recipes.");
      return;
    }
    if (source) {
      const remResult = await removeFromMealPlan(
        source.day,
        recipeId,
        currentUser,
        source.slot
      );
      if (!remResult.ok) {
        showError(`Couldn't move: ${remResult.error || "unknown error"}`);
        return;
      }
    }
    const addResult = await addToMealPlan(
      target.day,
      recipeId,
      currentUser,
      target.slot
    );
    if (!addResult.ok) {
      showError(`Couldn't add: ${addResult.error || "unknown error"}`);
      return;
    }
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
    setShowClearConfirm(false);
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
    `px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
      view === tab
        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
    }`;

  return (
    <AuthGate>
      <div className="space-y-6">
        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-800 dark:text-red-200 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Save failed</p>
              <p className="mt-0.5 break-words">{errorMessage}</p>
              {errorMessage.toLowerCase().includes("meal_slot") && (
                <p className="mt-2 text-xs">
                  Looks like the <code>meal_slot</code> column is missing. Run{" "}
                  <code>supabase-migration-meal-slot.sql</code> in the Supabase
                  SQL Editor.
                </p>
              )}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300 shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
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
              aria-label={
                reminderEnabled
                  ? "Reminder on — edit"
                  : "Set meal plan reminder"
              }
              title={reminderEnabled ? "Reminder on" : "Set reminder"}
              className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${
                reminderEnabled
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
          )}
        </div>

        {!currentUser ? (
          <div />
        ) : (
          <>
            <div className="flex items-center flex-wrap gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                <button onClick={() => setView("mine")} className={tabClasses("mine")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Plan
                </button>
                <button onClick={() => setView("family")} className={tabClasses("family")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Family
                  {otherPlans.length > 0 && (
                    <span className="ml-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs px-1.5 py-0.5 rounded-full">
                      {otherPlans.length}
                    </span>
                  )}
                </button>
              </div>
              {view === "mine" && (
                <>
                  <div className="ml-auto inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                    <button
                      onClick={() => switchLayout("kanban")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                        planLayout === "kanban"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      title="Kanban view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v14H4zM10 6h4v14h-4zM16 6h4v14h-4z" />
                      </svg>
                      <span className="hidden sm:inline">Kanban</span>
                    </button>
                    <button
                      onClick={() => switchLayout("list")}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
                        planLayout === "list"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      title="List view"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>
                </>
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
            defaultEmail={profile?.email || ""}
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

        {view === "mine" && currentUser && totalMeals > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
              <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-700">
                <span className="bg-emerald-500 text-white text-xs font-bold w-6 h-6 rounded-full inline-flex items-center justify-center">
                  {totalMeals}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  meal{totalMeals !== 1 ? "s" : ""} planned
                </span>
              </div>
              <div className="flex items-center gap-1 flex-1 justify-end">
                <button
                  onClick={() => router.push("/grocery-list")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
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
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Grocery list
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                    />
                  </svg>
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full">
              <div className="flex items-start gap-3">
                <div className="bg-red-100 dark:bg-red-900/40 rounded-full p-2 shrink-0">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Clear this week&apos;s plan?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Removes all {totalMeals} meal{totalMeals !== 1 ? "s" : ""}{" "}
                    you&apos;ve planned for the week of {weekRange}.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearPlan}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Clear plan
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


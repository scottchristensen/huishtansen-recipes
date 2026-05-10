"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getRecipes } from "@/lib/recipes-store";
import {
  getCurrentUser,
  getCurrentWeekStart,
  getMealPlan,
  getWeekRange,
} from "@/lib/meal-plan-store";
import { Recipe } from "@/lib/types";
import {
  AggregateInput,
  GroceryEntry,
  aggregateIngredients,
  formatEntry,
} from "@/lib/grocery";
import AuthGate from "@/components/AuthGate";

type Mode = "healthy" | "cheap";
const ALL_MODES: Mode[] = ["healthy", "cheap"];

const MODE_META: Record<
  Mode,
  {
    label: string;
    icon: string;
    activeBtn: string;
    inactiveBtnHover: string;
    appliedPill: string;
    pillText: string;
  }
> = {
  healthy: {
    label: "Make it healthy",
    icon: "🥗",
    activeBtn:
      "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    inactiveBtnHover: "hover:bg-emerald-50 dark:hover:bg-slate-800",
    appliedPill:
      "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-300 dark:ring-emerald-700",
    pillText: "text-emerald-700 dark:text-emerald-300",
  },
  cheap: {
    label: "Make it cheap",
    icon: "💰",
    activeBtn:
      "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200",
    inactiveBtnHover: "hover:bg-amber-50 dark:hover:bg-slate-800",
    appliedPill:
      "bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-300 dark:ring-amber-700",
    pillText: "text-amber-700 dark:text-amber-300",
  },
};

interface Suggestion {
  mode: Mode;
  original: string;
  alternative: string;
  reason: string;
}

export default function GroceryListPage() {
  const { profile } = useAuth();
  const [planner, setPlanner] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [plannedRecipeIds, setPlannedRecipeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [activeModes, setActiveModes] = useState<Set<Mode>>(new Set());
  const [loadingModes, setLoadingModes] = useState<Set<Mode>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [appliedByKey, setAppliedByKey] = useState<Map<string, Mode>>(
    new Map()
  );
  const [suggestionsSource, setSuggestionsSource] = useState<
    "ai" | "built-in" | null
  >(null);

  const weekStart = useMemo(() => getCurrentWeekStart(), []);
  const weekRange = useMemo(() => {
    const { start, end } = getWeekRange(weekStart);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [weekStart]);

  const load = useCallback(async (currentPlanner: string) => {
    const [allRecipes, plan] = await Promise.all([
      getRecipes(),
      currentPlanner ? getMealPlan(currentPlanner) : Promise.resolve([]),
    ]);
    setRecipes(allRecipes);
    setPlannedRecipeIds(plan.flatMap((d) => d.recipeIds));
    setLoading(false);
  }, []);

  useEffect(() => {
    const p = profile?.chef_name || getCurrentUser();
    setPlanner(p);
    load(p);
  }, [profile, load]);

  const recipesById = useMemo(() => {
    const m = new Map<string, Recipe>();
    recipes.forEach((r) => m.set(r.id, r));
    return m;
  }, [recipes]);

  const aggregateInputs = useMemo<AggregateInput[]>(() => {
    const seen = new Set<string>();
    const out: AggregateInput[] = [];
    for (const id of plannedRecipeIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const r = recipesById.get(id);
      if (!r) continue;
      out.push({ recipeName: r.name, ingredients: r.ingredients });
    }
    return out;
  }, [plannedRecipeIds, recipesById]);

  const entries = useMemo<GroceryEntry[]>(
    () => aggregateIngredients(aggregateInputs),
    [aggregateInputs]
  );

  const formattedEntries = useMemo(
    () =>
      entries.map((e) => ({
        entry: e,
        formatted: formatEntry(e),
      })),
    [entries]
  );

  // suggestionMap: original text → Map<Mode, Suggestion>
  const suggestionMap = useMemo(() => {
    const m = new Map<string, Map<Mode, Suggestion>>();
    for (const s of suggestions) {
      if (!m.has(s.original)) m.set(s.original, new Map());
      m.get(s.original)!.set(s.mode, s);
    }
    return m;
  }, [suggestions]);

  const hasAnyMode = activeModes.size > 0;

  const toggleChecked = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleApplied = (key: string, mode: Mode) => {
    setAppliedByKey((prev) => {
      const next = new Map(prev);
      const cur = next.get(key);
      if (cur === mode) next.delete(key);
      else next.set(key, mode);
      return next;
    });
  };

  const fetchSuggestions = async (mode: Mode) => {
    if (formattedEntries.length === 0) return;
    setLoadingModes((prev) => {
      const next = new Set(prev);
      next.add(mode);
      return next;
    });
    try {
      const res = await fetch("/api/grocery-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: formattedEntries.map((f) => f.formatted),
          mode,
        }),
      });
      const data = await res.json();
      const incoming: Suggestion[] = (data.suggestions || []).map(
        (s: { original: string; alternative: string; reason: string }) => ({
          ...s,
          mode,
        })
      );
      setSuggestions((prev) => [
        ...prev.filter((s) => s.mode !== mode),
        ...incoming,
      ]);
      if (data.source) setSuggestionsSource(data.source);
    } catch {
      setSuggestions((prev) => prev.filter((s) => s.mode !== mode));
    } finally {
      setLoadingModes((prev) => {
        const next = new Set(prev);
        next.delete(mode);
        return next;
      });
    }
  };

  const toggleMode = async (mode: Mode) => {
    if (activeModes.has(mode)) {
      // Turn off this mode
      setActiveModes((prev) => {
        const next = new Set(prev);
        next.delete(mode);
        return next;
      });
      setSuggestions((prev) => prev.filter((s) => s.mode !== mode));
      setAppliedByKey((prev) => {
        const next = new Map(prev);
        for (const [k, v] of next) {
          if (v === mode) next.delete(k);
        }
        return next;
      });
      return;
    }
    setActiveModes((prev) => {
      const next = new Set(prev);
      next.add(mode);
      return next;
    });
    await fetchSuggestions(mode);
  };

  const handleClearAll = () => {
    setActiveModes(new Set());
    setSuggestions([]);
    setAppliedByKey(new Map());
    setSuggestionsSource(null);
  };

  const handleCopy = async () => {
    const lines = formattedEntries.map(({ entry, formatted }) => {
      const appliedMode = appliedByKey.get(entry.key);
      if (appliedMode) {
        const sug = suggestionMap.get(formatted)?.get(appliedMode);
        if (sug) return `- ${sug.alternative}`;
      }
      return `- ${formatted}`;
    });
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  if (loading) {
    return (
      <AuthGate>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className="space-y-6">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Grocery List
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Built from your meal plan for {weekRange} ·{" "}
              {planner || "no planner set"}
            </p>
          </div>
          {formattedEntries.length > 0 && (
            <button
              onClick={handleCopy}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Copy list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ALL_MODES.map((m) => {
            const meta = MODE_META[m];
            const active = activeModes.has(m);
            const isLoading = loadingModes.has(m);
            return (
              <button
                key={m}
                onClick={() => toggleMode(m)}
                disabled={formattedEntries.length === 0 || isLoading}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  active
                    ? meta.activeBtn
                    : `border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 ${meta.inactiveBtnHover}`
                }`}
              >
                <span>{meta.icon}</span>
                {meta.label}
                {isLoading && (
                  <span className="ml-1 inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            );
          })}
          {hasAnyMode && (
            <button
              onClick={handleClearAll}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2"
            >
              Clear suggestions
            </button>
          )}
          {suggestionsSource === "built-in" && hasAnyMode && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Built-in suggestions (set ANTHROPIC_API_KEY for AI swaps)
            </span>
          )}
        </div>

        {formattedEntries.length === 0 ? (
          <div className="text-center px-6 py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-4xl mb-3">🛒</div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              Nothing to buy yet
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Add recipes to your meal plan and they&apos;ll show up here automatically.
            </p>
            <a
              href="/meal-plan"
              className="inline-block mt-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              Open meal plan →
            </a>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <div className="col-span-1"></div>
              <div className={hasAnyMode ? "col-span-4" : "col-span-8"}>
                Item
              </div>
              {hasAnyMode && (
                <div className="col-span-4">Suggested swaps</div>
              )}
              <div className="col-span-3 text-right">Used in</div>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {formattedEntries.map(({ entry, formatted }) => {
                const isChecked = checked.has(entry.key);
                const swaps = suggestionMap.get(formatted);
                const appliedMode = appliedByKey.get(entry.key);
                const itemHasSuggestions =
                  hasAnyMode &&
                  Array.from(activeModes).some((m) => swaps?.has(m));
                return (
                  <li
                    key={entry.key}
                    className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-start transition-colors ${
                      isChecked ? "opacity-60" : ""
                    } hover:bg-slate-50 dark:hover:bg-slate-800/40`}
                  >
                    <div className="col-span-1 pt-1">
                      <button
                        onClick={() => toggleChecked(entry.key)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 hover:border-emerald-400"
                        }`}
                        aria-label={isChecked ? "Uncheck" : "Check"}
                      >
                        {isChecked && (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div
                      className={`${hasAnyMode ? "col-span-4" : "col-span-8"} text-sm pt-1 ${
                        appliedMode
                          ? "text-slate-400 dark:text-slate-500 line-through"
                          : "text-slate-800 dark:text-slate-200"
                      } ${isChecked ? "line-through" : ""}`}
                    >
                      {formatted}
                    </div>
                    {hasAnyMode && (
                      <div className="col-span-4 text-sm space-y-1">
                        {itemHasSuggestions ? (
                          ALL_MODES.filter((m) => activeModes.has(m)).map(
                            (m) => {
                              const sug = swaps?.get(m);
                              if (!sug) return null;
                              const meta = MODE_META[m];
                              const isApplied = appliedMode === m;
                              return (
                                <button
                                  key={m}
                                  onClick={() => toggleApplied(entry.key, m)}
                                  className={`w-full text-left rounded-md px-2 py-1.5 transition-colors ${
                                    isApplied
                                      ? meta.appliedPill
                                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  }`}
                                  title={sug.reason}
                                >
                                  <div className="flex items-start gap-1.5">
                                    <span className={meta.pillText}>
                                      {meta.icon}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium">
                                        {sug.alternative}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                        {sug.reason}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            }
                          )
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs italic">
                            (no swap)
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className="col-span-3 text-xs text-slate-500 dark:text-slate-400 text-right pt-1"
                      title={entry.recipes.join(", ")}
                    >
                      {entry.recipes.length}{" "}
                      <span className="text-slate-400 dark:text-slate-500">
                        recipe{entry.recipes.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {loadingModes.size > 0 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                Generating {Array.from(loadingModes).join(" + ")} suggestions…
              </div>
            )}

            {hasAnyMode && loadingModes.size === 0 && (
              <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                Tap a suggestion to apply it. Applied swaps are used when you copy the list.
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

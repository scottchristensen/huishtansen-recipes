"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { getRecipe, saveRecipe } from "@/lib/recipes-store";
import {
  MealSlot,
  SLOT_ICON,
  SLOT_LABEL,
  getMealPlan,
  getCurrentUser,
} from "@/lib/meal-plan-store";
import { splitIngredientLines } from "@/lib/ingredients";
import { scaleIngredientLine } from "@/lib/scaling";
import {
  RECIPE_SCALE_EVENT,
  getRecipeScale,
} from "@/lib/recipe-scale";
import AuthGate from "@/components/AuthGate";
import ScaleControl from "@/components/ScaleControl";

interface ActiveTimer {
  id: string;
  chipKey: string;
  label: string;
  durationMs: number;
  startedAt: number;
  done: boolean;
}

interface CookRecipe {
  id?: string;
  name: string;
  ingredients: string;
  instructions: string;
  chef?: string;
  time?: string;
  photo?: string;
  photos?: string[];
  stepImages?: string[];
  link?: string;
  source?: "saved" | "url" | "guess";
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function slotForTime(date: Date): MealSlot {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 4 && hour < 10.5) return "breakfast";
  if (hour >= 10.5 && hour < 15) return "lunch";
  return "dinner";
}

interface TimeChip {
  text: string;
  ms: number;
  key: string;
}

function parseTimes(line: string): TimeChip[] {
  const re =
    /(\d+(?:\.\d+)?)(?:\s*(?:to|-|–|–)\s*(\d+(?:\.\d+)?))?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
  const out: TimeChip[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const v1 = parseFloat(m[1]);
    const v2 = m[2] ? parseFloat(m[2]) : v1;
    const value = (v1 + v2) / 2;
    const unit = m[3].toLowerCase();
    let secs: number;
    if (unit.startsWith("h")) secs = value * 3600;
    else if (unit.startsWith("m")) secs = value * 60;
    else secs = value;
    const ms = Math.max(1000, Math.round(secs * 1000));
    const label = formatDuration(ms);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ text: m[0], ms, key: `${ms}-${out.length}` });
  }
  return out;
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec >= 3600) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.round((totalSec % 3600) / 60);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  if (totalSec >= 60) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return s ? `${m}m ${s}s` : `${m}m`;
  }
  return `${totalSec}s`;
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CookPage() {
  return (
    <AuthGate>
      <Suspense fallback={<CookFallback />}>
        <CookInner />
      </Suspense>
    </AuthGate>
  );
}

function CookFallback() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-slate-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
}

function CookInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const recipeIdParam = searchParams.get("recipe");

  const [recipe, setRecipe] = useState<CookRecipe | null>(null);
  const [guess, setGuess] = useState<{
    slot: MealSlot;
    day: string;
    recipes: Recipe[];
  } | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [, setTick] = useState(0);
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [saveError, setSaveError] = useState("");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepedRef = useRef<Set<string>>(new Set());

  const ensureAudioCtx = () => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  const playAlarm = useCallback(() => {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      const startAt = ctx.currentTime + i * 0.45;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.35, startAt + 0.04);
      gain.gain.linearRampToValueAtTime(0, startAt + 0.4);
      osc.start(startAt);
      osc.stop(startAt + 0.42);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTimers((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        const elapsed = Date.now() - t.startedAt;
        if (!t.done && elapsed >= t.durationMs) {
          if (!beepedRef.current.has(t.id)) {
            beepedRef.current.add(t.id);
            playAlarm();
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate([300, 150, 300, 150, 300]);
              } catch {}
            }
          }
          changed = true;
          return { ...t, done: true };
        }
        return t;
      });
      return changed ? next : prev;
    });
  });

  useEffect(() => {
    if (!recipeIdParam) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = await getRecipe(recipeIdParam);
      if (!cancelled && r) {
        setRecipe({
          id: r.id,
          name: r.name,
          ingredients: r.ingredients,
          instructions: r.instructions,
          chef: r.chef,
          time: r.time,
          photo: r.photo,
          photos: r.attemptPhotos,
          source: "saved",
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeIdParam]);

  useEffect(() => {
    if (recipeIdParam) return;
    if (recipe) return;
    let cancelled = false;
    (async () => {
      const planner = getCurrentUser();
      if (!planner) return;
      const plan = await getMealPlan(planner);
      if (cancelled) return;
      const now = new Date();
      const todayName = DAY_NAMES[now.getDay()];
      const slot = slotForTime(now);
      const todayPlan = plan.find((d) => d.day === todayName);
      if (!todayPlan) return;
      const ids = todayPlan.slots[slot];
      if (ids.length === 0) return;
      const recipes: Recipe[] = [];
      for (const id of ids) {
        const r = await getRecipe(id);
        if (r) recipes.push(r);
      }
      if (!cancelled && recipes.length > 0) {
        setGuess({ slot, day: todayName, recipes });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeIdParam, recipe]);

  const loadFromUrl = async () => {
    if (!url) return;
    ensureAudioCtx();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Couldn't load that recipe");
      setRecipe({
        name: data.recipe.name,
        ingredients: data.recipe.ingredients,
        instructions: data.recipe.instructions,
        chef: "Web",
        time: data.recipe.time,
        photo: data.recipe.photo,
        photos: data.recipe.photos,
        stepImages: data.recipe.stepImages,
        link: url,
        source: "url",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const pickGuess = (r: Recipe) => {
    ensureAudioCtx();
    setRecipe({
      id: r.id,
      name: r.name,
      ingredients: r.ingredients,
      instructions: r.instructions,
      chef: r.chef,
      time: r.time,
      photo: r.photo,
      photos: r.attemptPhotos,
      source: "guess",
    });
  };

  const startTimer = (chipKey: string, label: string, durationMs: number) => {
    ensureAudioCtx();
    setTimers((prev) => {
      const existing = prev.find((t) => t.chipKey === chipKey);
      if (existing) beepedRef.current.delete(existing.id);
      const others = prev.filter((t) => t.chipKey !== chipKey);
      return [
        ...others,
        {
          id: `${Date.now()}-${Math.random()}`,
          chipKey,
          label,
          durationMs,
          startedAt: Date.now(),
          done: false,
        },
      ];
    });
  };

  const dismissTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
    beepedRef.current.delete(id);
  };

  const timerByChip = useMemo(() => {
    const map = new Map<string, ActiveTimer>();
    for (const t of timers) map.set(t.chipKey, t);
    return map;
  }, [timers]);

  const saveToLibrary = async () => {
    if (!recipe) return;
    setSavingToLibrary(true);
    setSaveError("");
    try {
      const saved = await saveRecipe({
        name: recipe.name,
        type: "Main Course",
        chef:
          recipe.chef && recipe.chef !== "Web"
            ? recipe.chef
            : getCurrentUser() || "Unknown",
        difficulty: "Medium",
        time: recipe.time || "",
        servings: "",
        photo: recipe.photo || "",
        instructions: recipe.instructions,
        ingredients: recipe.ingredients,
        link: recipe.link || "",
        tags: [],
        status: "want-to-try",
        notes: "",
        remix_of: null,
        remix_label: "",
      });
      if (!saved) throw new Error("Couldn't save the recipe");
      setRecipe({ ...recipe, id: saved.id, source: "saved" });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingToLibrary(false);
    }
  };

  const extraPhotos = useMemo(() => {
    const photos = recipe?.photos || [];
    if (photos.length === 0) return [];
    const norm = (u: string) => u.split("?")[0];
    const coverKey = recipe?.photo ? norm(recipe.photo) : "";
    const seen = new Set<string>();
    if (coverKey) seen.add(coverKey);
    const out: string[] = [];
    for (const src of photos) {
      const key = norm(src);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(src);
    }
    return out;
  }, [recipe]);

  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!recipe?.id) return;
    setScale(getRecipeScale(recipe.id));
    const refresh = (e: Event) => {
      const detail = (e as CustomEvent<{ recipeId: string; scale: number }>)
        .detail;
      if (detail?.recipeId === recipe.id) setScale(detail.scale);
    };
    window.addEventListener(RECIPE_SCALE_EVENT, refresh);
    return () => window.removeEventListener(RECIPE_SCALE_EVENT, refresh);
  }, [recipe?.id]);

  const ingredientLines = useMemo(
    () =>
      splitIngredientLines(recipe?.ingredients).map((line) =>
        scaleIngredientLine(line, scale)
      ),
    [recipe, scale]
  );

  const instructionSteps = useMemo(() => {
    const raw = (recipe?.instructions || "").split(/\n+/);
    return raw
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, i) => ({
        index: i + 1,
        text: line.replace(/^\s*\d+[.)]\s*/, ""),
        times: parseTimes(line),
      }));
  }, [recipe]);

  if (recipe) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider font-medium text-emerald-700 dark:text-emerald-400 mb-1">
              {recipe.source === "guess"
                ? `Cooking now ${guess ? `· ${guess.day} ${SLOT_LABEL[guess.slot]}` : ""}`
                : recipe.source === "saved"
                  ? "Cooking from your library"
                  : "Cooking from URL"}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {recipe.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {recipe.chef ? `By ${recipe.chef}` : ""}
              {recipe.chef && recipe.time ? " · " : ""}
              {recipe.time || ""}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setRecipe(null);
                setUrl("");
                setError("");
                setSaveError("");
                router.replace("/cook");
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cook something else
            </button>
            {recipe.source === "url" && (
              <button
                onClick={saveToLibrary}
                disabled={savingToLibrary}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
              >
                {savingToLibrary ? "Saving..." : "+ Add to recipes"}
              </button>
            )}
            {recipe.source === "saved" && recipe.id && (
              <a
                href={`/recipe/${recipe.id}`}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                View in library
              </a>
            )}
          </div>
        </div>
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        )}

        {recipe.photo && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="relative w-full h-48 sm:h-72 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              <div className="absolute inset-0 flex items-center justify-center text-6xl text-slate-400 dark:text-slate-600">
                🍽️
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={recipe.photo}
                alt={recipe.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            {extraPhotos.length > 0 && (
              <div className="flex gap-2 p-2 overflow-x-auto bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                {extraPhotos.map((src, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    className="h-16 w-24 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 h-fit lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Ingredients
              </h2>
              {recipe.id && <ScaleControl recipeId={recipe.id} />}
            </div>
            <ul className="space-y-2">
              {ingredientLines.map((line, i) => (
                <IngredientItem key={i} line={line} />
              ))}
            </ul>
          </aside>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
              Instructions
            </h2>
            <ol className="space-y-4">
              {instructionSteps.map((step) => (
                <li
                  key={step.index}
                  className="flex gap-3 text-slate-800 dark:text-slate-200"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-semibold flex items-center justify-center">
                    {step.index}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="leading-relaxed">{step.text}</p>
                    {recipe.stepImages?.[step.index - 1] && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={recipe.stepImages[step.index - 1]}
                        alt={`Step ${step.index}`}
                        className="mt-2 rounded-lg max-h-56 w-full object-cover border border-slate-200 dark:border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    {step.times.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {step.times.map((tc) => {
                          const chipKey = `step-${step.index}-${tc.key}`;
                          const timer = timerByChip.get(chipKey);
                          if (timer) {
                            const remaining =
                              timer.durationMs - (Date.now() - timer.startedAt);
                            const done = remaining <= 0 || timer.done;
                            return (
                              <span
                                key={tc.key}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                                  done
                                    ? "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 animate-pulse"
                                    : "bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                <span>{done ? "🔔" : "⏱"}</span>
                                <span className="font-mono">
                                  {done
                                    ? "Time's up!"
                                    : formatRemaining(remaining)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => dismissTimer(timer.id)}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5"
                                  aria-label="Dismiss timer"
                                >
                                  <svg
                                    className="w-3 h-3"
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
                              </span>
                            );
                          }
                          return (
                            <button
                              key={tc.key}
                              onClick={() =>
                                startTimer(
                                  chipKey,
                                  `Step ${step.index} · ${formatDuration(tc.ms)}`,
                                  tc.ms
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M6 4l10 6-10 6V4z" />
                              </svg>
                              {formatDuration(tc.ms)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Cook Mode
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          A clean, ad-free view of any recipe, with one-click step timers
        </p>
      </div>

      {guess && (
        <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{SLOT_ICON[guess.slot]}</span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Looks like you&apos;re about to make {guess.day}&apos;s{" "}
              {SLOT_LABEL[guess.slot].toLowerCase()}
            </p>
          </div>
          <div className="space-y-2">
            {guess.recipes.map((r) => (
              <button
                key={r.id}
                onClick={() => pickGuess(r)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden shrink-0">
                  {r.photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={r.photo}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      🍽️
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {r.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {r.chef} · {r.time}
                  </div>
                </div>
                <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg">
                  Start cooking
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
          Cook from a recipe URL
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Paste any recipe link and we&apos;ll strip out the blog post and ads
          and lay out just the ingredients and steps.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadFromUrl();
            }}
            placeholder="https://..."
            className="w-full sm:flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={loadFromUrl}
            disabled={!url || loading}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Cook"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {!guess && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Tip: open a recipe from your library and tap &ldquo;Start
          Cooking&rdquo; to load it here automatically.
        </p>
      )}
    </div>
  );
}

function IngredientItem({ line }: { line: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <li>
      <label className="flex items-start gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 accent-emerald-500"
        />
        <span
          className={
            checked
              ? "text-slate-400 dark:text-slate-500 line-through"
              : "text-slate-700 dark:text-slate-200"
          }
        >
          {line}
        </span>
      </label>
    </li>
  );
}

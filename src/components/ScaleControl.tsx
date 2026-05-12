"use client";

import { useEffect, useState } from "react";
import { formatScaleLabel } from "@/lib/scaling";
import {
  RECIPE_SCALE_EVENT,
  getRecipeScale,
  setRecipeScale,
} from "@/lib/recipe-scale";

interface ScaleControlProps {
  recipeId: string;
}

const PRESETS = [0.5, 1, 2];

export default function ScaleControl({ recipeId }: ScaleControlProps) {
  const [scale, setScale] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  useEffect(() => {
    setScale(getRecipeScale(recipeId));
    setHydrated(true);
    const refresh = (e: Event) => {
      const detail = (e as CustomEvent<{ recipeId: string; scale: number }>)
        .detail;
      if (detail?.recipeId === recipeId) setScale(detail.scale);
    };
    window.addEventListener(RECIPE_SCALE_EVENT, refresh);
    return () => window.removeEventListener(RECIPE_SCALE_EVENT, refresh);
  }, [recipeId]);

  const updateScale = (next: number) => {
    if (!Number.isFinite(next) || next <= 0) return;
    setRecipeScale(recipeId, next);
    setScale(next);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(customValue);
    if (Number.isFinite(n) && n > 0) {
      updateScale(n);
      setCustomOpen(false);
      setCustomValue("");
    }
  };

  if (!hydrated) return null;

  const isCustom = scale !== 1 && !PRESETS.includes(scale);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider font-medium text-slate-500 dark:text-slate-400">
          Scale
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((p) => {
            const active = scale === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => updateScale(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-600 text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {formatScaleLabel(p)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isCustom
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {isCustom ? formatScaleLabel(scale) : "Custom"}
          </button>
        </div>
      </div>

      {customOpen && (
        <form
          onSubmit={handleCustomSubmit}
          className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700"
        >
          <label className="text-xs text-slate-600 dark:text-slate-300">
            Multiply by
          </label>
          <input
            type="number"
            step="0.25"
            min="0.1"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="e.g. 1.5"
            className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}

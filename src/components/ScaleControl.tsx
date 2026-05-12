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
    <div className="inline-flex flex-col items-end gap-1 relative">
      <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
        {PRESETS.map((p) => {
          const active = scale === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => updateScale(p)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                active
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {formatScaleLabel(p)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            isCustom
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          {isCustom ? formatScaleLabel(scale) : "Custom"}
        </button>
      </div>
      {customOpen && (
        <form
          onSubmit={handleCustomSubmit}
          className="absolute top-full right-0 mt-1 z-10 inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
        >
          <span className="text-[11px] text-slate-500 dark:text-slate-400">×</span>
          <input
            type="number"
            step="0.25"
            min="0.1"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="1.5"
            className="w-16 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-2 py-0.5 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}

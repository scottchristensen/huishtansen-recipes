"use client";

import { useEffect, useRef, useState } from "react";

export default function AddRecipeButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors"
      >
        <span className="sm:hidden">+ Add</span>
        <span className="hidden sm:inline">+ Add Recipe</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-30">
          <a
            href="/add"
            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-lg">📝</span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Add manually
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Type out the ingredients and steps
              </div>
            </div>
          </a>
          <a
            href="/import"
            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-200 dark:border-slate-700"
          >
            <span className="text-lg">🔗</span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Add from URL
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Paste a recipe link, autofill the form
              </div>
            </div>
          </a>
          <a
            href="/add/photo"
            className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-200 dark:border-slate-700"
          >
            <span className="text-lg">📷</span>
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Add from photo
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Snap a cookbook page or recipe card
              </div>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

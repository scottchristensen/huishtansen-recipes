"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { setPendingMealPlanRecipes } from "@/lib/meal-plan-store";
import { deleteRecipe } from "@/lib/recipes-store";

interface SelectionActionBarProps {
  selectedRecipes: Recipe[];
  onClear: () => void;
  onActionComplete: () => void;
}

export default function SelectionActionBar({
  selectedRecipes,
  onClear,
  onActionComplete,
}: SelectionActionBarProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const count = selectedRecipes.length;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleAddToMealPlan = () => {
    setPendingMealPlanRecipes(selectedRecipes.map((r) => r.id));
    router.push("/meal-plan");
  };

  const handleShare = async () => {
    const links = selectedRecipes.map(
      (r) => `${window.location.origin}/recipe/${r.id}`
    );

    if (count === 1 && navigator.share) {
      try {
        await navigator.share({
          title: selectedRecipes[0].name,
          url: links[0],
        });
        return;
      } catch {
        // user cancelled or share unsupported — fall through to copy
      }
    }

    const text =
      count === 1
        ? links[0]
        : selectedRecipes.map((r, i) => `${r.name}: ${links[i]}`).join("\n");
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${count} link${count !== 1 ? "s" : ""} to clipboard`);
  };

  const handleDelete = async () => {
    setBusy(true);
    for (const recipe of selectedRecipes) {
      await deleteRecipe(recipe.id);
    }
    setBusy(false);
    setShowDeleteConfirm(false);
    showToast(`Deleted ${count} recipe${count !== 1 ? "s" : ""}`);
    onActionComplete();
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {showDeleteConfirm && (
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
                  Delete {count} recipe{count !== 1 ? "s" : ""}?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  They&apos;ll be hidden from the app — recoverable from the database if needed.
                </p>
                <ul className="mt-3 text-sm text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto">
                  {selectedRecipes.map((r) => (
                    <li key={r.id} className="py-0.5">
                      • {r.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-700">
            <span className="bg-emerald-600 text-white text-xs font-bold w-6 h-6 rounded-full inline-flex items-center justify-center">
              {count}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-300">selected</span>
          </div>

          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <button
              onClick={handleAddToMealPlan}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Add to meal plan
            </button>

            <button
              onClick={handleShare}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
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
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
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
              Delete
            </button>
          </div>

          <button
            onClick={onClear}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            title="Clear selection"
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
      </div>
    </>
  );
}

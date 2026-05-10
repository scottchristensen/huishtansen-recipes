"use client";

import { useState } from "react";
import { Recipe } from "@/lib/types";
import RecipeCard from "./RecipeCard";

interface IngredientSearchProps {
  recipes: Recipe[];
}

export default function IngredientSearch({ recipes }: IngredientSearchProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Recipe[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!input.trim()) return;

    const terms = input
      .toLowerCase()
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const scored = recipes
      .map((recipe) => {
        const ingredientsLower = recipe.ingredients.toLowerCase();
        const matchCount = terms.filter((term) =>
          ingredientsLower.includes(term)
        ).length;
        return { recipe, matchCount, ratio: matchCount / terms.length };
      })
      .filter((r) => r.matchCount > 0)
      .sort((a, b) => b.ratio - a.ratio || b.matchCount - a.matchCount);

    setResults(scored.map((s) => s.recipe));
    setSearched(true);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors w-full justify-center sm:w-auto"
      >
        <span>🧊</span>
        What can I make with...?
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🧊</span>
          What&apos;s in your kitchen?
        </h3>
        <button
          onClick={() => {
            setOpen(false);
            setSearched(false);
            setInput("");
            setResults([]);
          }}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm"
        >
          Close
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="chicken, rice, avocado..."
          autoFocus
          className="flex-1 px-3 py-2.5 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <button
          onClick={handleSearch}
          disabled={!input.trim()}
          className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {searched && (
        <div>
          {results.length > 0 ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Found {results.length} recipe{results.length !== 1 ? "s" : ""}{" "}
                matching your ingredients
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.slice(0, 6).map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🤔</div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                No recipes match those ingredients. Try different ones!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

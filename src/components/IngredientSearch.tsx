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
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm text-stone-600 hover:bg-amber-50 transition-colors w-full justify-center sm:w-auto"
      >
        <span>🧊</span>
        What can I make with...?
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
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
          className="text-stone-400 hover:text-stone-600 text-sm"
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
          className="flex-1 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <button
          onClick={handleSearch}
          disabled={!input.trim()}
          className="px-5 py-2.5 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {searched && (
        <div>
          {results.length > 0 ? (
            <>
              <p className="text-sm text-stone-500 mb-3">
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
              <p className="text-stone-500 text-sm">
                No recipes match those ingredients. Try different ones!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

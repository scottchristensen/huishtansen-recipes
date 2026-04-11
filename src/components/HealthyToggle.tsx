"use client";

import { useState } from "react";
import { HealthySuggestion } from "@/lib/types";

interface HealthyToggleProps {
  recipeName: string;
  ingredients: string;
  onCreateRemix: (modifiedIngredients: string) => void;
}

export default function HealthyToggle({
  recipeName,
  ingredients,
  onCreateRemix,
}: HealthyToggleProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<HealthySuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [source, setSource] = useState<string>("");

  const fetchSuggestions = async () => {
    if (suggestions.length > 0) {
      setOpen(!open);
      return;
    }

    setOpen(true);
    setLoading(true);

    try {
      const res = await fetch("/api/healthy-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, recipeName }),
      });

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setSource(data.source || "built-in");
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  };

  const applyAndRemix = () => {
    let modified = ingredients;
    for (const i of selected) {
      const s = suggestions[i];
      // Simple replacement in the ingredients text
      const escaped = s.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      if (regex.test(modified)) {
        modified = modified.replace(regex, `${s.substitute} (was: ${s.original})`);
      } else {
        modified += `\n\nSubstitution: ${s.original} -> ${s.substitute}`;
      }
    }
    onCreateRemix(modified);
  };

  return (
    <div className="border-t border-amber-100 pt-4">
      <button
        onClick={fetchSuggestions}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          open
            ? "bg-green-100 text-green-800 border border-green-200"
            : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
        }`}
      >
        <span>🥗</span>
        Make It Healthy
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-stone-500 py-4">
              <span className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
              Finding healthy swaps...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <p className="text-xs text-stone-400">
                {source === "ai"
                  ? "AI-powered suggestions"
                  : "Suggested swaps based on common substitutions"}
                {" — select the ones you want to try:"}
              </p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => toggleSelection(i)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selected.has(i)
                      ? "bg-green-50 border-green-300"
                      : "bg-white border-amber-100 hover:border-green-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected.has(i)
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-stone-300"
                      }`}
                    >
                      {selected.has(i) && (
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
                    </div>
                    <div>
                      <div className="text-sm">
                        <span className="text-stone-500 line-through">
                          {s.original}
                        </span>
                        <span className="text-stone-400 mx-2">&#8594;</span>
                        <span className="text-green-700 font-medium">
                          {s.substitute}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {s.reason}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {selected.size > 0 && (
                <button
                  onClick={applyAndRemix}
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors"
                >
                  Save as Healthy Remix ({selected.size} swap
                  {selected.size !== 1 ? "s" : ""})
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400 py-2">
              No suggestions available for this recipe.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

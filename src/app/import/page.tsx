"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { saveRecipe, getRecipes } from "@/lib/recipes-store";
import AuthGate from "@/components/AuthGate";

export default function ImportRecipe() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Partial<Recipe> | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError("");
    setPreview(null);

    try {
      const res = await fetch("/api/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to import recipe");
        return;
      }

      setPreview({
        name: data.recipe.name,
        ingredients: data.recipe.ingredients,
        instructions: data.recipe.instructions,
        photo: data.recipe.photo,
        time: data.recipe.time,
        servings: data.recipe.servings,
        type: data.recipe.type || "Main Course",
        chef: "",
        difficulty: "Medium",
        link: url,
        status: "want-to-try",
      });
    } catch {
      setError("Something went wrong. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!preview) return;

    const recipes = getRecipes();
    const maxId = Math.max(...recipes.map((r) => parseInt(r.id)), 0);

    const recipe: Recipe = {
      id: String(maxId + 1),
      name: preview.name || "Imported Recipe",
      type: preview.type || "Main Course",
      chef: preview.chef || "Web",
      difficulty: (preview.difficulty as Recipe["difficulty"]) || "Medium",
      time: preview.time || "",
      servings: preview.servings || "",
      photo: preview.photo || "",
      instructions: preview.instructions || "",
      ingredients: preview.ingredients || "",
      link: preview.link || url,
      tags: [],
      status: "want-to-try",
      attemptPhotos: [],
      notes: "",
    };

    saveRecipe(recipe);
    router.push(`/recipe/${recipe.id}`);
  };

  const updatePreview = (field: string, value: string) => {
    setPreview((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const inputClasses =
    "w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent";

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-amber-600 hover:text-amber-800 text-sm font-medium mb-4 inline-flex items-center gap-1"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
          <h1 className="text-2xl font-bold text-stone-900 mb-1">
            Import from URL
          </h1>
          <p className="text-sm text-stone-500 mb-6">
            Paste a recipe URL from any website — we&apos;ll strip out the blog
            story and ads and pull just the recipe.
          </p>

          {/* URL input */}
          <div className="flex gap-2 mb-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://pinchofyum.com/amazing-recipe..."
              className={`${inputClasses} flex-1`}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url) handleImport();
              }}
            />
            <button
              onClick={handleImport}
              disabled={!url || loading}
              className="px-5 py-2 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </span>
              ) : (
                "Import"
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Preview / Edit */}
          {preview && (
            <div className="space-y-4 border-t border-amber-100 pt-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 text-lg">&#10003;</span>
                <span className="text-sm font-medium text-green-700">
                  Recipe found! Review and edit before saving.
                </span>
              </div>

              {preview.photo && (
                <div className="aspect-[2/1] rounded-lg overflow-hidden bg-amber-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.photo}
                    alt={preview.name || "Recipe"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Recipe Name
                </label>
                <input
                  type="text"
                  value={preview.name || ""}
                  onChange={(e) => updatePreview("name", e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Source / Chef
                  </label>
                  <input
                    type="text"
                    value={preview.chef || ""}
                    onChange={(e) => updatePreview("chef", e.target.value)}
                    placeholder="Pinterest, Olivia, Web..."
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Type
                  </label>
                  <select
                    value={preview.type || "Main Course"}
                    onChange={(e) => updatePreview("type", e.target.value)}
                    className={inputClasses}
                  >
                    <option>Main Course</option>
                    <option>Salad</option>
                    <option>Breakfast</option>
                    <option>Dessert</option>
                    <option>Baked Good</option>
                    <option>Appetizers/Snacks</option>
                    <option>Side Dish</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={preview.difficulty || "Medium"}
                    onChange={(e) => updatePreview("difficulty", e.target.value)}
                    className={inputClasses}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Prep Time
                  </label>
                  <input
                    type="text"
                    value={preview.time || ""}
                    onChange={(e) => updatePreview("time", e.target.value)}
                    placeholder="30 min"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Servings
                  </label>
                  <input
                    type="text"
                    value={preview.servings || ""}
                    onChange={(e) => updatePreview("servings", e.target.value)}
                    placeholder="4"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Ingredients
                </label>
                <textarea
                  rows={8}
                  value={preview.ingredients || ""}
                  onChange={(e) => updatePreview("ingredients", e.target.value)}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Instructions
                </label>
                <textarea
                  rows={8}
                  value={preview.instructions || ""}
                  onChange={(e) =>
                    updatePreview("instructions", e.target.value)
                  }
                  className={inputClasses}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors"
                >
                  Save to My Recipes
                </button>
                <button
                  onClick={() => {
                    setPreview(null);
                    setUrl("");
                  }}
                  className="px-6 py-3 border border-amber-200 text-stone-600 rounded-lg font-medium hover:bg-amber-50 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}

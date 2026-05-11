"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { saveRecipe } from "@/lib/recipes-store";
import { getCurrentUser } from "@/lib/meal-plan-store";
import AuthGate from "@/components/AuthGate";
import ChefSelect from "@/components/ChefSelect";

export default function ImportRecipe() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        chef: getCurrentUser(),
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

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);

    const recipe = await saveRecipe({
      name: preview.name || "Imported Recipe",
      type: preview.type || "Main Course",
      chef: preview.chef || getCurrentUser() || "Unknown",
      difficulty: (preview.difficulty as Recipe["difficulty"]) || "Medium",
      time: preview.time || "",
      servings: preview.servings || "",
      photo: preview.photo || "",
      instructions: preview.instructions || "",
      ingredients: preview.ingredients || "",
      link: preview.link || url,
      tags: [],
      status: "want-to-try",
      notes: "",
      remix_of: null,
      remix_label: "",
    });

    if (recipe) {
      router.push(`/recipe/${recipe.id}`);
    } else {
      setSaving(false);
    }
  };

  const updatePreview = (field: string, value: string) => {
    setPreview((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const inputClasses =
    "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Import from URL</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Paste a recipe URL from any website. We&apos;ll strip out the blog story and ads and pull just the recipe.</p>

          <div className="flex gap-2 mb-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://pinchofyum.com/amazing-recipe..."
              className={`${inputClasses} flex-1`}
              onKeyDown={(e) => { if (e.key === "Enter" && url) handleImport(); }}
            />
            <button onClick={handleImport} disabled={!url || loading} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 shrink-0">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Importing...
                </span>
              ) : "Import"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {preview && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 dark:text-green-400 text-lg">&#10003;</span>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Recipe found! Review and edit before saving.</span>
              </div>

              {preview.photo && (
                <div className="aspect-[2/1] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview.photo} alt={preview.name || "Recipe"} className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Recipe Name</label>
                <input type="text" value={preview.name || ""} onChange={(e) => updatePreview("name", e.target.value)} className={inputClasses} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Source / Chef</label>
                  <ChefSelect value={preview.chef || ""} onChange={(v) => updatePreview("chef", v)} placeholder="Pick a chef" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Type</label>
                  <select value={preview.type || "Main Course"} onChange={(e) => updatePreview("type", e.target.value)} className={inputClasses}>
                    <option>Main Course</option><option>Salad</option><option>Breakfast</option><option>Dessert</option><option>Baked Good</option><option>Appetizers/Snacks</option><option>Side Dish</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Difficulty</label>
                  <select value={preview.difficulty || "Medium"} onChange={(e) => updatePreview("difficulty", e.target.value)} className={inputClasses}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Prep Time</label>
                  <input type="text" value={preview.time || ""} onChange={(e) => updatePreview("time", e.target.value)} placeholder="30 min" className={inputClasses} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Servings</label>
                  <input type="text" value={preview.servings || ""} onChange={(e) => updatePreview("servings", e.target.value)} placeholder="4" className={inputClasses} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Ingredients</label>
                <textarea rows={8} value={preview.ingredients || ""} onChange={(e) => updatePreview("ingredients", e.target.value)} className={inputClasses} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Instructions</label>
                <textarea rows={8} value={preview.instructions || ""} onChange={(e) => updatePreview("instructions", e.target.value)} className={inputClasses} />
              </div>

              <div className="pt-4 flex gap-3">
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  {saving ? "Saving..." : "Save to My Recipes"}
                </button>
                <button onClick={() => { setPreview(null); setUrl(""); }} className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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

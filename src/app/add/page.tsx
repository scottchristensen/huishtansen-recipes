"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { saveRecipe } from "@/lib/recipes-store";
import { useAuth } from "@/lib/auth-context";
import AuthGate from "@/components/AuthGate";

export default function AddRecipe() {
  const router = useRouter();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "Main Course",
    chef: "",
    difficulty: "Easy" as Recipe["difficulty"],
    time: "",
    servings: "",
    photo: "",
    instructions: "",
    ingredients: "",
    link: "",
    status: "want-to-try" as Recipe["status"],
  });

  // Auto-fill chef from signed-in user's profile
  useEffect(() => {
    if (profile?.chef_name && !form.chef) {
      setForm((prev) => ({ ...prev, chef: profile.chef_name }));
    }
  }, [profile, form.chef]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const recipe = await saveRecipe({
      ...form,
      tags: [],
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

  const inputClasses =
    "w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent";

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="text-amber-600 hover:text-amber-800 text-sm font-medium mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6">
          <h1 className="text-2xl font-bold text-stone-900 mb-6">Add Recipe</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Recipe Name *</label>
              <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Mom's Famous Pasta" className={inputClasses} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Chef / Source *</label>
                <input type="text" required value={form.chef} onChange={(e) => update("chef", e.target.value)} placeholder="Who made this?" className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
                <select value={form.type} onChange={(e) => update("type", e.target.value)} className={inputClasses}>
                  <option>Main Course</option><option>Salad</option><option>Breakfast</option><option>Dessert</option><option>Baked Good</option><option>Appetizers/Snacks</option><option>Side Dish</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Difficulty</label>
                <select value={form.difficulty} onChange={(e) => update("difficulty", e.target.value)} className={inputClasses}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Prep Time</label>
                <input type="text" value={form.time} onChange={(e) => update("time", e.target.value)} placeholder="30 min" className={inputClasses} />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Servings</label>
                <input type="text" value={form.servings} onChange={(e) => update("servings", e.target.value)} placeholder="4" className={inputClasses} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Photo URL</label>
              <input type="url" value={form.photo} onChange={(e) => update("photo", e.target.value)} placeholder="https://..." className={inputClasses} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Ingredients *</label>
              <textarea required rows={6} value={form.ingredients} onChange={(e) => update("ingredients", e.target.value)} placeholder="List your ingredients..." className={inputClasses} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Instructions *</label>
              <textarea required rows={6} value={form.instructions} onChange={(e) => update("instructions", e.target.value)} placeholder="Step by step instructions..." className={inputClasses} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Original Recipe Link</label>
              <input type="url" value={form.link} onChange={(e) => update("link", e.target.value)} placeholder="https://..." className={inputClasses} />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" value="want-to-try" checked={form.status === "want-to-try"} onChange={(e) => update("status", e.target.value)} className="accent-amber-500" />
                  <span className="text-sm text-stone-700">Want to Try</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" value="family-approved" checked={form.status === "family-approved"} onChange={(e) => update("status", e.target.value)} className="accent-amber-500" />
                  <span className="text-sm text-stone-700">Family Approved</span>
                </label>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="submit" disabled={saving} className="flex-1 bg-amber-500 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save Recipe"}
              </button>
              <button type="button" onClick={() => router.back()} className="px-6 py-3 border border-amber-200 text-stone-600 rounded-lg font-medium hover:bg-amber-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthGate>
  );
}

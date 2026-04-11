"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { getRecipe, getRecipes, saveRecipe, deleteRecipe } from "@/lib/recipes-store";
import AuthGate from "@/components/AuthGate";
import PhotoUpload from "@/components/PhotoUpload";
import HealthyToggle from "@/components/HealthyToggle";

const difficultyColor = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-amber-100 text-amber-800",
  Hard: "bg-red-100 text-red-800",
};

export default function RecipeDetail() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const r = getRecipe(params.id as string);
    if (r) {
      setRecipe(r);
      setNotes(r.notes || "");
    }
  }, [params.id]);

  if (!recipe) {
    return (
      <AuthGate>
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-stone-400 text-lg">Recipe not found</p>
          <a
            href="/"
            className="text-amber-600 hover:underline mt-2 inline-block"
          >
            Back to recipes
          </a>
        </div>
      </AuthGate>
    );
  }

  const toggleStatus = () => {
    const updated = {
      ...recipe,
      status:
        recipe.status === "family-approved"
          ? ("want-to-try" as const)
          : ("family-approved" as const),
    };
    saveRecipe(updated);
    setRecipe(updated);
  };

  const handlePhotosChange = (photos: string[]) => {
    const updated = { ...recipe, attemptPhotos: photos };
    saveRecipe(updated);
    setRecipe(updated);
  };

  const handleNotesBlur = () => {
    if (notes !== (recipe.notes || "")) {
      const updated = { ...recipe, notes };
      saveRecipe(updated);
      setRecipe(updated);
    }
  };

  const startEditing = () => {
    setEditForm({ ...recipe });
    setEditing(true);
  };

  const saveEdit = () => {
    const updated = { ...recipe, ...editForm } as Recipe;
    saveRecipe(updated);
    setRecipe(updated);
    setEditing(false);
  };

  const handleDelete = () => {
    deleteRecipe(recipe.id);
    router.push("/");
  };

  const handleCreateRemix = (modifiedIngredients: string) => {
    const recipes = getRecipes();
    const maxId = Math.max(...recipes.map((r) => parseInt(r.id)), 0);

    const remix: Recipe = {
      ...recipe,
      id: String(maxId + 1),
      name: `${recipe.name} (Healthy Remix)`,
      ingredients: modifiedIngredients,
      remixOf: recipe.id,
      remixLabel: `Healthier version of ${recipe.chef}'s original`,
      status: "want-to-try",
      tags: [...recipe.tags.filter((t) => t !== "vegetarian"), "healthy-remix"],
      attemptPhotos: [],
      notes: "",
    };

    saveRecipe(remix);
    router.push(`/recipe/${remix.id}`);
  };

  const updateEdit = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' fill='%23fef3c7'%3E%3Crect width='800' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='64' fill='%23d97706'%3E🍽️%3C/text%3E%3C/svg%3E";

  const inputClasses =
    "w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent";

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

        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="aspect-[2/1] relative overflow-hidden bg-amber-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={recipe.photo || fallbackImage}
              alt={recipe.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackImage;
              }}
            />
          </div>

          <div className="p-6 space-y-6">
            {/* Header */}
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.name || ""}
                  onChange={(e) => updateEdit("name", e.target.value)}
                  className={`${inputClasses} text-xl font-bold`}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editForm.chef || ""}
                    onChange={(e) => updateEdit("chef", e.target.value)}
                    placeholder="Chef"
                    className={inputClasses}
                  />
                  <select
                    value={editForm.type || ""}
                    onChange={(e) => updateEdit("type", e.target.value)}
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
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={editForm.difficulty || ""}
                    onChange={(e) => updateEdit("difficulty", e.target.value)}
                    className={inputClasses}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                  <input
                    type="text"
                    value={editForm.time || ""}
                    onChange={(e) => updateEdit("time", e.target.value)}
                    placeholder="Time"
                    className={inputClasses}
                  />
                  <input
                    type="text"
                    value={editForm.servings || ""}
                    onChange={(e) => updateEdit("servings", e.target.value)}
                    placeholder="Servings"
                    className={inputClasses}
                  />
                </div>
                <input
                  type="url"
                  value={editForm.photo || ""}
                  onChange={(e) => updateEdit("photo", e.target.value)}
                  placeholder="Photo URL"
                  className={inputClasses}
                />
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold text-stone-900">
                    {recipe.name}
                  </h1>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}
                    >
                      {recipe.difficulty}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500">
                  <span>By {recipe.chef}</span>
                  <span>{recipe.time}</span>
                  <span>{recipe.type}</span>
                  <span>Serves {recipe.servings}</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={toggleStatus}
                    className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                      recipe.status === "family-approved"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {recipe.status === "family-approved"
                      ? "Family Approved"
                      : "Want to Try"}
                  </button>
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-2">
                Ingredients
              </h2>
              {editing ? (
                <textarea
                  rows={8}
                  value={editForm.ingredients || ""}
                  onChange={(e) => updateEdit("ingredients", e.target.value)}
                  className={inputClasses}
                />
              ) : (
                <div className="text-stone-700 text-sm leading-relaxed whitespace-pre-line bg-amber-50/50 rounded-lg p-4">
                  {recipe.ingredients}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h2 className="text-lg font-semibold text-stone-900 mb-2">
                Instructions
              </h2>
              {editing ? (
                <textarea
                  rows={8}
                  value={editForm.instructions || ""}
                  onChange={(e) => updateEdit("instructions", e.target.value)}
                  className={inputClasses}
                />
              ) : (
                <div className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">
                  {recipe.instructions}
                </div>
              )}
            </div>

            {/* Edit mode: link */}
            {editing && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Original Recipe Link
                </label>
                <input
                  type="url"
                  value={editForm.link || ""}
                  onChange={(e) => updateEdit("link", e.target.value)}
                  className={inputClasses}
                />
              </div>
            )}

            {/* Photo upload section */}
            {!editing && (
              <div className="border-t border-amber-100 pt-4">
                <PhotoUpload
                  photos={recipe.attemptPhotos || []}
                  onPhotosChange={handlePhotosChange}
                />
              </div>
            )}

            {/* Remix indicator */}
            {!editing && recipe.remixOf && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <span className="text-green-600">🥗</span>
                <div className="text-sm">
                  <span className="text-green-700 font-medium">
                    {recipe.remixLabel || "Healthy Remix"}
                  </span>
                  <span className="text-stone-400 mx-1">·</span>
                  <a
                    href={`/recipe/${recipe.remixOf}`}
                    className="text-green-600 hover:underline"
                  >
                    View original
                  </a>
                </div>
              </div>
            )}

            {/* Make It Healthy */}
            {!editing && !recipe.remixOf && (
              <HealthyToggle
                recipeName={recipe.name}
                ingredients={recipe.ingredients}
                onCreateRemix={handleCreateRemix}
              />
            )}

            {/* Notes section */}
            {!editing && (
              <div className="border-t border-amber-100 pt-4">
                <h3 className="text-sm font-medium text-stone-700 mb-2">
                  Notes
                </h3>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes about this recipe... (saves automatically)"
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* Link + actions */}
            <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
              <div>
                {recipe.link && !editing && (
                  <a
                    href={recipe.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-800 text-sm font-medium inline-flex items-center gap-1"
                  >
                    View original recipe
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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border border-amber-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startEditing}
                      className="px-4 py-2 border border-amber-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-3">
                  Are you sure you want to delete &ldquo;{recipe.name}&rdquo;?
                  This can&apos;t be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

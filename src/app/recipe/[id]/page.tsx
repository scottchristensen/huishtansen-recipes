"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import {
  getRecipe,
  getRecipes,
  saveRecipe,
  deleteRecipe,
  uploadRecipePhoto,
  deleteRecipePhoto,
  uploadCoverPhoto,
  isRecipeNew,
} from "@/lib/recipes-store";
import AuthGate from "@/components/AuthGate";
import HealthyToggle from "@/components/HealthyToggle";

const difficultyColor = {
  Easy: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  Medium: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
  Hard: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
};

export default function RecipeDetail() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Recipe>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const loadRecipe = useCallback(async () => {
    const r = await getRecipe(params.id as string);
    if (r) {
      setRecipe(r);
      setNotes(r.notes || "");
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadRecipe();
  }, [loadRecipe]);

  if (loading) {
    return (
      <AuthGate>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      </AuthGate>
    );
  }

  if (!recipe) {
    return (
      <AuthGate>
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🍽️</div>
          <p className="text-slate-400 dark:text-slate-500 text-lg">Recipe not found</p>
          <a
            href="/"
            className="text-emerald-700 dark:text-emerald-400 hover:underline mt-2 inline-block"
          >
            Back to recipes
          </a>
        </div>
      </AuthGate>
    );
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    await uploadCoverPhoto(recipe.id, file);
    const updated = await getRecipe(recipe.id);
    if (updated) setRecipe(updated);
    setUploadingCover(false);
    e.target.value = "";
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploadingPhoto(true);
    for (const file of Array.from(files)) {
      await uploadRecipePhoto(recipe.id, file);
    }
    // Reload recipe to get updated photos
    const updated = await getRecipe(recipe.id);
    if (updated) setRecipe(updated);
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleRemovePhoto = async (photoUrl: string) => {
    await deleteRecipePhoto(recipe.id, photoUrl);
    const updated = await getRecipe(recipe.id);
    if (updated) setRecipe(updated);
  };

  const handleNotesBlur = async () => {
    if (notes !== (recipe.notes || "")) {
      const updated = await saveRecipe({ id: recipe.id, notes });
      if (updated) setRecipe(updated);
    }
  };

  const startEditing = () => {
    setEditForm({ ...recipe });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    const updated = await saveRecipe({ ...editForm, id: recipe.id });
    if (updated) setRecipe(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    await deleteRecipe(recipe.id);
    router.push("/");
  };

  const handleCreateRemix = async (modifiedIngredients: string) => {
    const recipes = await getRecipes();
    const remix = await saveRecipe({
      name: `${recipe.name} (Healthy Remix)`,
      type: recipe.type,
      chef: recipe.chef,
      difficulty: recipe.difficulty,
      time: recipe.time,
      servings: recipe.servings,
      photo: recipe.photo,
      instructions: recipe.instructions,
      ingredients: modifiedIngredients,
      link: recipe.link,
      tags: [...recipe.tags.filter((t) => t !== "vegetarian"), "healthy-remix"],
      status: "want-to-try" as const,
      notes: "",
      remix_of: recipe.id,
      remix_label: `Healthier version of ${recipe.chef}'s original`,
    });

    if (remix) router.push(`/recipe/${remix.id}`);
  };

  const updateEdit = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };


  const inputClasses =
    "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <a
            href={`/cook?recipe=${recipe.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <span>👨‍🍳</span>
            Start Cooking
          </a>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="aspect-[2/1] relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            {recipe.photo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={recipe.photo}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
                <label
                  className={`absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-medium px-3 py-1.5 rounded-full shadow cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                    uploadingCover ? "opacity-50" : ""
                  }`}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {uploadingCover ? "Uploading..." : "Replace"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="hidden"
                  />
                </label>
              </>
            ) : (
              <label
                className={`w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors ${
                  uploadingCover ? "opacity-50 cursor-wait" : ""
                }`}
              >
                <div className="text-5xl">🍽️</div>
                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {uploadingCover ? "Uploading..." : "Add cover photo"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                  className="hidden"
                />
              </label>
            )}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={editForm.chef || ""} onChange={(e) => updateEdit("chef", e.target.value)} placeholder="Chef" className={inputClasses} />
                  <select value={editForm.type || ""} onChange={(e) => updateEdit("type", e.target.value)} className={inputClasses}>
                    <option>Main Course</option><option>Salad</option><option>Breakfast</option><option>Dessert</option><option>Baked Good</option><option>Appetizers/Snacks</option><option>Side Dish</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={editForm.difficulty || ""} onChange={(e) => updateEdit("difficulty", e.target.value)} className={inputClasses}>
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                  <input type="text" value={editForm.time || ""} onChange={(e) => updateEdit("time", e.target.value)} placeholder="Time" className={inputClasses} />
                  <input type="text" value={editForm.servings || ""} onChange={(e) => updateEdit("servings", e.target.value)} placeholder="Servings" className={inputClasses} />
                </div>
                <input type="url" value={editForm.photo || ""} onChange={(e) => updateEdit("photo", e.target.value)} placeholder="Photo URL" className={inputClasses} />
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{recipe.name}</h1>
                  <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}>
                    {recipe.difficulty}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span>By {recipe.chef}</span>
                  <span>{recipe.time}</span>
                  <span>{recipe.type}</span>
                  <span>Serves {recipe.servings}</span>
                </div>
                {(isRecipeNew(recipe.created_at) || recipe.tags.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isRecipeNew(recipe.created_at) && (
                      <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-emerald-600 text-white">
                        New
                      </span>
                    )}
                    {recipe.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-slate-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Ingredients */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Ingredients</h2>
              {editing ? (
                <textarea rows={8} value={editForm.ingredients || ""} onChange={(e) => updateEdit("ingredients", e.target.value)} className={inputClasses} />
              ) : (
                <div className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">{recipe.ingredients}</div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Instructions</h2>
              {editing ? (
                <textarea rows={8} value={editForm.instructions || ""} onChange={(e) => updateEdit("instructions", e.target.value)} className={inputClasses} />
              ) : (
                <div className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line">{recipe.instructions}</div>
              )}
            </div>

            {editing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Original Recipe Link</label>
                <input type="url" value={editForm.link || ""} onChange={(e) => updateEdit("link", e.target.value)} className={inputClasses} />
              </div>
            )}

            {/* Remix indicator */}
            {!editing && recipe.remix_of && (
              <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">🥗</span>
                <div className="text-sm">
                  <span className="text-green-700 dark:text-green-300 font-medium">{recipe.remix_label || "Healthy Remix"}</span>
                  <span className="text-slate-400 dark:text-slate-500 mx-1">·</span>
                  <a href={`/recipe/${recipe.remix_of}`} className="text-green-600 dark:text-green-400 hover:underline">View original</a>
                </div>
              </div>
            )}

            {/* Make It Healthy */}
            {!editing && !recipe.remix_of && (
              <HealthyToggle recipeName={recipe.name} ingredients={recipe.ingredients} onCreateRemix={handleCreateRemix} />
            )}

            {/* Photo upload section */}
            {!editing && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">My Attempt Photos</h3>
                  <label className={`text-sm text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium cursor-pointer ${uploadingPhoto ? "opacity-50" : ""}`}>
                    {uploadingPhoto ? "Uploading..." : "+ Add Photo"}
                    <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                  </label>
                </div>
                {(recipe.attemptPhotos?.length || 0) > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {recipe.attemptPhotos!.map((photo, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt={`Attempt ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => handleRemovePhoto(photo)} className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <label className="block border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 dark:hover:border-slate-300 transition-colors">
                    <div className="text-2xl mb-1">📸</div>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Tap to upload photos of your attempts</p>
                    <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            )}

            {/* Notes section */}
            {!editing && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Notes</h3>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add notes about this recipe... (saves automatically)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* Link + actions */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                {recipe.link && !editing && (
                  <a href={recipe.link} target="_blank" rel="noopener noreferrer" className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium inline-flex items-center gap-1">
                    View original recipe
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSaveEdit} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">Save Changes</button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={startEditing} className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Edit</button>
                    <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/60 transition-colors">Delete</button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

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
                    Delete &ldquo;{recipe.name}&rdquo;?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    It&apos;ll be hidden from the app — recoverable from the database if needed.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}

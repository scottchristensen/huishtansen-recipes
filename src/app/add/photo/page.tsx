"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Recipe } from "@/lib/types";
import { saveRecipe, uploadCoverPhoto } from "@/lib/recipes-store";
import { useAuth } from "@/lib/auth-context";
import AuthGate from "@/components/AuthGate";

export default function AddRecipeFromPhoto() {
  const router = useRouter();
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Partial<Recipe> | null>(null);

  useEffect(() => {
    if (preview && profile?.chef_name && !preview.chef) {
      setPreview((prev) => (prev ? { ...prev, chef: profile.chef_name } : null));
    }
  }, [preview, profile]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setPreview(null);
    setScanning(true);

    try {
      const dataUrl = await resizeImage(file, 1568);
      setImageDataUrl(dataUrl);

      const res = await fetch("/api/parse-recipe-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not read the recipe from this photo.");
        return;
      }

      const r = data.recipe || {};
      const looksEmpty =
        !String(r.name || "").trim() &&
        !String(r.ingredients || "").trim() &&
        !String(r.instructions || "").trim();

      if (looksEmpty) {
        setError(
          "Couldn't find a recipe in this photo. Try a clearer or closer-up shot."
        );
        return;
      }

      setPreview({
        name: r.name || "",
        ingredients: r.ingredients || "",
        instructions: r.instructions || "",
        time: r.time || "",
        servings: r.servings || "",
        type: r.type || "Main Course",
        difficulty: "Medium",
        chef: profile?.chef_name || "",
        status: "want-to-try",
        link: "",
      });
    } catch {
      setError("Something went wrong reading that photo. Try again.");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updatePreview = (field: string, value: string) => {
    setPreview((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);

    const recipe = await saveRecipe({
      name: preview.name || "Untitled Recipe",
      type: preview.type || "Main Course",
      chef: preview.chef || "Unknown",
      difficulty: (preview.difficulty as Recipe["difficulty"]) || "Medium",
      time: preview.time || "",
      servings: preview.servings || "",
      photo: "",
      instructions: preview.instructions || "",
      ingredients: preview.ingredients || "",
      link: "",
      tags: [],
      status: preview.status || "want-to-try",
      notes: "",
      remix_of: null,
      remix_label: "",
    });

    if (!recipe) {
      setSaving(false);
      setError("Failed to save the recipe.");
      return;
    }

    if (imageDataUrl) {
      const file = await dataUrlToFile(imageDataUrl, `scan-${Date.now()}.jpg`);
      if (file) await uploadCoverPhoto(recipe.id, file);
    }

    router.push(`/recipe/${recipe.id}`);
  };

  const reset = () => {
    setPreview(null);
    setImageDataUrl("");
    setError("");
  };

  const inputClasses =
    "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.push("/")}
          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium mb-4 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Add from photo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Take a photo or upload one of a cookbook page, recipe card, or
            handwritten recipe — we&apos;ll read it and fill in the form for you.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />

          {!preview && !scanning && (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-10 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors"
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Tap to take or upload a photo
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Best results: good lighting, page filling the frame, text in focus
              </p>
            </div>
          )}

          {scanning && (
            <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg p-10 text-center">
              <div className="inline-flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <span className="w-5 h-5 border-2 border-emerald-300 border-t-emerald-700 dark:border-emerald-700 dark:border-t-emerald-400 rounded-full animate-spin" />
                <span className="text-sm font-medium">Reading the recipe...</span>
              </div>
              {imageDataUrl && (
                <div className="mt-4 max-h-64 overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl} alt="Uploaded" className="w-full object-cover" />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-sm font-medium text-red-700 dark:text-red-400 underline"
              >
                Try a different photo
              </button>
            </div>
          )}

          {preview && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600 dark:text-green-400 text-lg">&#10003;</span>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Recipe scanned. Review and edit before saving.
                </span>
              </div>

              {imageDataUrl && (
                <div className="aspect-[2/1] rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageDataUrl} alt="Scanned recipe" className="w-full h-full object-contain" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Recipe Name</label>
                <input type="text" value={preview.name || ""} onChange={(e) => updatePreview("name", e.target.value)} className={inputClasses} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Chef / Source</label>
                  <input type="text" value={preview.chef || ""} onChange={(e) => updatePreview("chef", e.target.value)} placeholder="Who made this?" className={inputClasses} />
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
                <button onClick={reset} className="px-6 py-3 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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

function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type || "image/jpeg" });
  } catch {
    return null;
  }
}

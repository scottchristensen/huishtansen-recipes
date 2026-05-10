"use client";

import { supabase } from "./supabase";
import { Recipe } from "./types";

export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }

  return data.map(mapDbToRecipe);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const recipe = mapDbToRecipe(data);

  // Load attempt photos
  const { data: photos } = await supabase
    .from("recipe_photos")
    .select("storage_path")
    .eq("recipe_id", id)
    .order("created_at");

  if (photos) {
    recipe.attemptPhotos = photos.map((p) => {
      const { data: urlData } = supabase.storage
        .from("recipe-photos")
        .getPublicUrl(p.storage_path);
      return urlData.publicUrl;
    });
  }

  return recipe;
}

export async function saveRecipe(recipe: Partial<Recipe> & { id?: string }): Promise<Recipe | null> {
  const dbRecord = mapRecipeToDb(recipe);

  if (recipe.id) {
    // Update
    const { data, error } = await supabase
      .from("recipes")
      .update(dbRecord)
      .eq("id", recipe.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating recipe:", error);
      return null;
    }
    return mapDbToRecipe(data);
  } else {
    // Insert
    const { data, error } = await supabase
      .from("recipes")
      .insert(dbRecord)
      .select()
      .single();

    if (error) {
      console.error("Error inserting recipe:", error);
      return null;
    }
    return mapDbToRecipe(data);
  }
}

export async function deleteRecipe(id: string): Promise<boolean> {
  // Soft delete: sets deleted_at instead of removing the row.
  // Recovery instructions are in supabase-migration-soft-delete.sql.
  const { error } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Error deleting recipe:", error);
    return false;
  }
  return true;
}

export async function uploadRecipePhoto(
  recipeId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${recipeId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("recipe-photos")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Error uploading photo:", uploadError);
    return null;
  }

  const { error: dbError } = await supabase
    .from("recipe_photos")
    .insert({ recipe_id: recipeId, storage_path: path });

  if (dbError) {
    console.error("Error saving photo record:", dbError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("recipe-photos")
    .getPublicUrl(path);

  return urlData.publicUrl;
}

export async function uploadCoverPhoto(
  recipeId: string,
  file: File
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${recipeId}/cover-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("recipe-photos")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Error uploading cover photo:", uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from("recipe-photos")
    .getPublicUrl(path);

  const updated = await saveRecipe({ id: recipeId, photo: urlData.publicUrl });
  if (!updated) return null;

  return urlData.publicUrl;
}

export async function deleteRecipePhoto(
  recipeId: string,
  photoUrl: string
): Promise<boolean> {
  // Extract storage path from URL
  const urlParts = photoUrl.split("/recipe-photos/");
  if (urlParts.length < 2) return false;
  const storagePath = urlParts[1];

  await supabase.storage.from("recipe-photos").remove([storagePath]);
  await supabase
    .from("recipe_photos")
    .delete()
    .eq("recipe_id", recipeId)
    .eq("storage_path", storagePath);

  return true;
}

export function getUniqueChefs(recipes: Recipe[]): string[] {
  return [...new Set(recipes.map((r) => r.chef))].sort();
}

export function getUniqueTypes(recipes: Recipe[]): string[] {
  return [...new Set(recipes.map((r) => r.type))].sort();
}

// Recipes added before this date never get the "New" badge — keeps existing
// seed data from showing up as new. Anything created on/after this date that's
// within the freshness window gets the badge.
const NEW_BADGE_CUTOFF = new Date("2026-05-10T00:00:00").getTime();
const NEW_BADGE_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

export function isRecipeNew(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (created < NEW_BADGE_CUTOFF) return false;
  return Date.now() - created <= NEW_BADGE_WINDOW_MS;
}

export function parseTimeMinutes(time: string): number | null {
  const match = time.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToRecipe(data: any): Recipe {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    chef: data.chef,
    difficulty: data.difficulty,
    time: data.time,
    servings: data.servings,
    photo: data.photo,
    instructions: data.instructions,
    ingredients: data.ingredients,
    link: data.link,
    tags: data.tags || [],
    status: data.status,
    notes: data.notes || "",
    remix_of: data.remix_of,
    remix_label: data.remix_label || "",
    created_at: data.created_at,
    updated_at: data.updated_at,
    attemptPhotos: [],
  };
}

function mapRecipeToDb(recipe: Partial<Recipe>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = {};
  if (recipe.name !== undefined) db.name = recipe.name;
  if (recipe.type !== undefined) db.type = recipe.type;
  if (recipe.chef !== undefined) db.chef = recipe.chef;
  if (recipe.difficulty !== undefined) db.difficulty = recipe.difficulty;
  if (recipe.time !== undefined) db.time = recipe.time;
  if (recipe.servings !== undefined) db.servings = recipe.servings;
  if (recipe.photo !== undefined) db.photo = recipe.photo;
  if (recipe.instructions !== undefined) db.instructions = recipe.instructions;
  if (recipe.ingredients !== undefined) db.ingredients = recipe.ingredients;
  if (recipe.link !== undefined) db.link = recipe.link;
  if (recipe.tags !== undefined) db.tags = recipe.tags;
  if (recipe.status !== undefined) db.status = recipe.status;
  if (recipe.notes !== undefined) db.notes = recipe.notes;
  if (recipe.remix_of !== undefined) db.remix_of = recipe.remix_of;
  if (recipe.remix_label !== undefined) db.remix_label = recipe.remix_label;
  return db;
}

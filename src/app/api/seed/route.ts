import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { seedRecipes } from "@/lib/seed-recipes";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if recipes already exist
  const { count } = await supabase
    .from("recipes")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json({
      message: `Database already has ${count} recipes. Skipping seed.`,
      seeded: false,
    });
  }

  // Insert all seed recipes (without the old string IDs — Supabase generates UUIDs)
  const records = seedRecipes.map((r) => ({
    name: r.name,
    type: r.type,
    chef: r.chef,
    difficulty: r.difficulty,
    time: r.time,
    servings: r.servings,
    photo: r.photo,
    instructions: r.instructions,
    ingredients: r.ingredients,
    link: r.link,
    tags: r.tags,
    status: r.status,
    notes: "",
    remix_label: "",
  }));

  const { data, error } = await supabase
    .from("recipes")
    .insert(records)
    .select();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: `Seeded ${data.length} recipes!`,
    seeded: true,
    count: data.length,
  });
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Recipe } from "@/lib/types";
import { getRecipes, uploadRecipePhoto } from "@/lib/recipes-store";
import { getMealPlan, MealPlan } from "@/lib/meal-plan-store";
import { supabase } from "@/lib/supabase";
import AuthGate from "@/components/AuthGate";
import RecipeCard from "@/components/RecipeCard";
import ChefAvatar from "@/components/ChefAvatar";

interface ChefProfile {
  name: string;
  avatar_emoji: string;
  bio: string;
  favorite_cuisine: string;
  cooking_since: string;
}

export default function ChefProfilePage() {
  const params = useParams();
  const chefName = decodeURIComponent(params.name as string);
  const [profile, setProfile] = useState<ChefProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [chefRecipes, setChefRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<"recipes" | "stats" | "plan">(
    "recipes"
  );

  const loadData = useCallback(async () => {
    const [allRecipes, plan] = await Promise.all([
      getRecipes(),
      getMealPlan(chefName),
    ]);

    const { data: profileData } = await supabase
      .from("chef_profiles")
      .select("*")
      .eq("name", chefName)
      .single();

    // Check for uploaded avatar
    const { data: avatarFiles } = await supabase.storage
      .from("recipe-photos")
      .list(`avatars`, { search: chefName.toLowerCase() });

    if (avatarFiles && avatarFiles.length > 0) {
      const { data: urlData } = supabase.storage
        .from("recipe-photos")
        .getPublicUrl(`avatars/${avatarFiles[0].name}`);
      setAvatarUrl(urlData.publicUrl);
    }

    setRecipes(allRecipes);
    setChefRecipes(allRecipes.filter((r) => r.chef === chefName));
    setMealPlan(plan);
    setProfile(
      profileData || {
        name: chefName,
        avatar_emoji: "🍴",
        bio: "",
        favorite_cuisine: "",
        cooking_since: "",
      }
    );
    setLoading(false);
  }, [chefName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <AuthGate>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      </AuthGate>
    );
  }

  if (!profile) {
    return (
      <AuthGate>
        <div className="text-center py-12">
          <p className="text-slate-400 dark:text-slate-500 text-lg">Chef not found</p>
        </div>
      </AuthGate>
    );
  }

  // Compute stats
  const typeBreakdown = chefRecipes.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const difficultyBreakdown = chefRecipes.reduce(
    (acc, r) => {
      acc[r.difficulty] = (acc[r.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const avgTime =
    chefRecipes.length > 0
      ? Math.round(
          chefRecipes.reduce((sum, r) => {
            const match = r.time.match(/(\d+)/);
            return sum + (match ? parseInt(match[1]) : 0);
          }, 0) / chefRecipes.length
        )
      : 0;

  const remixCount = chefRecipes.filter((r) => r.remix_of).length;

  // Signature dish: highest difficulty, then longest time
  const signatureDish = [...chefRecipes].sort((a, b) => {
    const diffOrder = { Hard: 3, Medium: 2, Easy: 1 };
    const diffDiff =
      (diffOrder[b.difficulty] || 0) - (diffOrder[a.difficulty] || 0);
    if (diffDiff !== 0) return diffDiff;
    const timeA = parseInt(a.time.match(/(\d+)/)?.[1] || "0");
    const timeB = parseInt(b.time.match(/(\d+)/)?.[1] || "0");
    return timeB - timeA;
  })[0];

  // Most used ingredients across their recipes
  const ingredientWords = chefRecipes
    .flatMap((r) =>
      r.ingredients
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((w) => w.length > 3)
    )
    .reduce(
      (acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const topIngredients = Object.entries(ingredientWords)
    .filter(
      ([word]) =>
        !["with", "then", "into", "from", "your", "until", "about", "them", "each", "this", "that", "cups", "tbsp", "teaspoon", "tablespoon", "minutes", "optional"].includes(
          word
        )
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  const plannedMeals = mealPlan.reduce(
    (sum, d) => sum + d.recipeIds.length,
    0
  );

  const recipesById = new Map(recipes.map((r) => [r.id, r]));

  const typeEmojis: Record<string, string> = {
    "Main Course": "🍽️",
    Salad: "🥗",
    Breakfast: "🍳",
    Dessert: "🍰",
    "Baked Good": "🍞",
    "Appetizers/Snacks": "🧆",
    "Side Dish": "🥘",
  };

  const tabClasses = (tab: string) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tab
        ? "bg-emerald-500 text-white"
        : "text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800"
    }`;

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-100 dark:border-slate-700 p-6 text-center">
          <div className="flex justify-center mb-3 relative group">
            <ChefAvatar
              name={profile.name}
              avatarUrl={avatarUrl}
              size="xl"
              linked={false}
            />
            <label className="absolute inset-0 w-16 h-16 mx-auto rounded-full cursor-pointer flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                {uploadingAvatar ? "..." : "Edit"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingAvatar(true);
                  const ext = file.name.split(".").pop() || "jpg";
                  const path = `avatars/${chefName.toLowerCase()}.${ext}`;
                  await supabase.storage
                    .from("recipe-photos")
                    .upload(path, file, {
                      contentType: file.type,
                      upsert: true,
                    });
                  const { data: urlData } = supabase.storage
                    .from("recipe-photos")
                    .getPublicUrl(path);
                  setAvatarUrl(urlData.publicUrl + "?t=" + Date.now());
                  setUploadingAvatar(false);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{profile.name}</h1>
          {profile.bio && (
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{profile.bio}</p>
          )}

          {/* Quick stats row */}
          <div className="flex justify-center gap-6 mt-5">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {chefRecipes.length}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Recipes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgTime}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Avg Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {plannedMeals}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">Planned</div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {profile.favorite_cuisine && (
              <span className="text-xs bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                Loves {profile.favorite_cuisine}
              </span>
            )}
            {chefRecipes.length >= 10 && (
              <span className="text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
                Prolific Chef
              </span>
            )}
            {remixCount > 0 && (
              <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                Health Remixer
              </span>
            )}
            {chefRecipes.some((r) => r.difficulty === "Hard") && (
              <span className="text-xs bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-3 py-1 rounded-full">
                Challenge Accepted
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("recipes")}
            className={tabClasses("recipes")}
          >
            Recipes
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={tabClasses("stats")}
          >
            Stats
          </button>
          <button
            onClick={() => setActiveTab("plan")}
            className={tabClasses("plan")}
          >
            This Week
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "recipes" && (
          <div>
            {chefRecipes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🍴</div>
                <p className="text-slate-400 dark:text-slate-500">
                  No recipes yet. Time to get cooking!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {chefRecipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="space-y-4">
            {/* Signature dish */}
            {signatureDish && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-4">
                <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Signature Dish
                </h3>
                <a
                  href={`/recipe/${signatureDish.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden shrink-0">
                    {signatureDish.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureDish.photo}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        🏆
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                      {signatureDish.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {signatureDish.difficulty} · {signatureDish.time}
                    </p>
                  </div>
                </a>
              </div>
            )}

            {/* Type breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-4">
              <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Recipe Types
              </h3>
              <div className="space-y-2">
                {Object.entries(typeBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center">
                        {typeEmojis[type] || "🍴"}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-200 w-32">
                        {type}
                      </span>
                      <div className="flex-1 bg-emerald-50 dark:bg-slate-800 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full transition-all"
                          style={{
                            width: `${(count / chefRecipes.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-slate-400 dark:text-slate-500 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Difficulty breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-4">
              <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Difficulty Spread
              </h3>
              <div className="flex gap-3">
                {(["Easy", "Medium", "Hard"] as const).map((diff) => {
                  const count = difficultyBreakdown[diff] || 0;
                  const colors = {
                    Easy: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
                    Medium: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
                    Hard: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
                  };
                  return (
                    <div
                      key={diff}
                      className={`flex-1 text-center py-3 rounded-xl border ${colors[diff]}`}
                    >
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs font-medium">{diff}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top ingredients */}
            {topIngredients.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-4">
                <h3 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  Go-To Ingredients
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topIngredients.map((word) => (
                    <span
                      key={word}
                      className="text-sm bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full capitalize"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "plan" && (
          <div className="space-y-2">
            {plannedMeals === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-slate-400 dark:text-slate-500">No meals planned this week</p>
                <a
                  href="/meal-plan"
                  className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm mt-2 inline-block"
                >
                  Go plan some meals
                </a>
              </div>
            ) : (
              mealPlan.map((day) => {
                if (day.recipeIds.length === 0) return null;
                return (
                  <div
                    key={day.day}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-3"
                  >
                    <h4 className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      {day.day}
                    </h4>
                    {day.recipeIds.map((id, idx) => {
                      const recipe = recipesById.get(id);
                      if (!recipe) return null;
                      return (
                        <a
                          key={`${id}-${idx}`}
                          href={`/recipe/${recipe.id}`}
                          className="flex items-center gap-3 py-1.5 group"
                        >
                          <div className="w-8 h-8 rounded-md bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden shrink-0">
                            {recipe.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={recipe.photo}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (
                                    e.target as HTMLImageElement
                                  ).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">
                                🍽️
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">
                            {recipe.name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </AuthGate>
  );
}

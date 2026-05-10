"use client";

import { Recipe } from "@/lib/types";
import { isRecipeNew } from "@/lib/recipes-store";
import ChefAvatar from "./ChefAvatar";

const difficultyColor = {
  Easy: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  Medium: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
  Hard: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <div className="group block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
      <a href={`/recipe/${recipe.id}`}>
        <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          {recipe.photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={recipe.photo}
              alt={recipe.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-slate-400 dark:text-slate-600">
              🍽️
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}
            >
              {recipe.difficulty}
            </span>
          </div>
          {isRecipeNew(recipe.created_at) && (
            <div className="absolute top-2 right-2">
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-600 text-white shadow">
                New
              </span>
            </div>
          )}
        </div>
      </a>
      <div className="p-4">
        <a href={`/recipe/${recipe.id}`}>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 transition-colors leading-tight">
            {recipe.name}
          </h3>
        </a>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <ChefAvatar name={recipe.chef} size="sm" />
          <a
            href={`/chef/${encodeURIComponent(recipe.chef)}`}
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            {recipe.chef}
          </a>
          <span>·</span>
          <span>{recipe.time}</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs bg-slate-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

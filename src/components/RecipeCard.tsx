"use client";

import { Recipe } from "@/lib/types";
import ChefAvatar from "./ChefAvatar";

const difficultyColor = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-amber-100 text-amber-800",
  Hard: "bg-red-100 text-red-800",
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23fef3c7'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23d97706'%3E🍽️%3C/text%3E%3C/svg%3E";

  return (
    <div className="group block bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow">
      <a href={`/recipe/${recipe.id}`}>
        <div className="aspect-[4/3] relative overflow-hidden bg-amber-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.photo || fallbackImage}
            alt={recipe.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
          <div className="absolute top-2 left-2">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}
            >
              {recipe.difficulty}
            </span>
          </div>
          {recipe.status === "want-to-try" && (
            <div className="absolute top-2 right-2">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                Want to Try
              </span>
            </div>
          )}
        </div>
      </a>
      <div className="p-4">
        <a href={`/recipe/${recipe.id}`}>
          <h3 className="font-semibold text-stone-900 group-hover:text-amber-600 transition-colors leading-tight">
            {recipe.name}
          </h3>
        </a>
        <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
          <ChefAvatar name={recipe.chef} size="sm" />
          <a
            href={`/chef/${encodeURIComponent(recipe.chef)}`}
            className="hover:text-amber-600 transition-colors"
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
                className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"
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

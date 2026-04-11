"use client";

import { Recipe } from "@/lib/types";

const difficultyColor = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-amber-100 text-amber-800",
  Hard: "bg-red-100 text-red-800",
};

const chefEmojis: Record<string, string> = {
  Olivia: "👩‍🍳",
  Darcey: "👩",
  Annika: "🧑‍🍳",
  Emma: "👧",
  Isabel: "👶",
  Scott: "👨‍🍳",
};

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23fef3c7'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23d97706'%3E🍽️%3C/text%3E%3C/svg%3E";

  return (
    <a
      href={`/recipe/${recipe.id}`}
      className="group block bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow"
    >
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
      <div className="p-4">
        <h3 className="font-semibold text-stone-900 group-hover:text-amber-600 transition-colors leading-tight">
          {recipe.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
          <span className="inline-flex items-center gap-1">
            <span>{chefEmojis[recipe.chef] || "🍴"}</span>
            <span>{recipe.chef}</span>
          </span>
          <span>·</span>
          <span>{recipe.time}</span>
          <span>·</span>
          <span>{recipe.type}</span>
        </div>
        {recipe.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.tags.slice(0, 4).map((tag) => (
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
    </a>
  );
}

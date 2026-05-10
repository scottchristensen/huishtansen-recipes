"use client";

import { useMemo, useState } from "react";
import { Recipe } from "@/lib/types";
import { isRecipeNew, parseTimeMinutes } from "@/lib/recipes-store";
import ChefAvatar from "./ChefAvatar";

const difficultyColor = {
  Easy: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300",
  Medium: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200",
  Hard: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
};

const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 };

type SortKey = "name" | "chef" | "type" | "difficulty" | "time";
type SortDir = "asc" | "desc";

function compareRecipes(a: Recipe, b: Recipe, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "chef":
      return a.chef.localeCompare(b.chef);
    case "type":
      return a.type.localeCompare(b.type);
    case "difficulty":
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    case "time": {
      const av = parseTimeMinutes(a.time);
      const bv = parseTimeMinutes(b.time);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    }
  }
}

interface RecipeTableProps {
  recipes: Recipe[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

export default function RecipeTable({
  recipes,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: RecipeTableProps) {
  const allSelected = recipes.length > 0 && recipes.every((r) => selectedIds.has(r.id));
  const someSelected = recipes.some((r) => selectedIds.has(r.id));

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const copy = [...recipes];
    copy.sort((a, b) => {
      const cmp = compareRecipes(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [recipes, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHeader = ({
    label,
    sortableKey,
    className = "",
  }: {
    label: string;
    sortableKey: SortKey;
    className?: string;
  }) => {
    const active = sortKey === sortableKey;
    return (
      <th className={`text-left font-medium px-4 py-3 ${className}`}>
        <button
          type="button"
          onClick={() => handleSort(sortableKey)}
          className="inline-flex items-center gap-1 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
        >
          {label}
          <span className="text-slate-400 dark:text-slate-500 text-xs">
            {active ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-20 px-3 py-3 w-12 bg-slate-50 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = !allSelected && someSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 dark:border-emerald-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  aria-label="Select all"
                />
              </th>
              <SortHeader
                label="Name"
                sortableKey="name"
                className="sticky left-12 z-20 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700"
              />
              <SortHeader label="Chef" sortableKey="chef" />
              <SortHeader label="Type" sortableKey="type" />
              <SortHeader label="Difficulty" sortableKey="difficulty" />
              <SortHeader label="Time" sortableKey="time" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((recipe) => {
              const isSelected = selectedIds.has(recipe.id);
              const rowBg = isSelected
                ? "bg-slate-50 dark:bg-slate-800"
                : "bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800";
              return (
                <tr
                  key={recipe.id}
                  className="group transition-colors"
                >
                  <td
                    className={`sticky left-0 z-10 px-3 py-2 w-12 ${rowBg}`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSelect(recipe.id)}
                      className="relative w-10 h-10 block rounded-md overflow-hidden cursor-pointer bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
                      aria-label={isSelected ? "Deselect" : "Select"}
                    >
                      {recipe.photo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={recipe.photo}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-slate-400 dark:text-slate-600">
                          🍽️
                        </div>
                      )}
                      <span
                        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                          isSelected
                            ? "opacity-100 bg-slate-900/40"
                            : "opacity-0 group-hover:opacity-100 bg-slate-900/30"
                        }`}
                      >
                        <span className="bg-white dark:bg-slate-900 rounded-sm p-0.5 shadow">
                          {isSelected ? (
                            <svg
                              className="w-3 h-3 text-emerald-700 dark:text-emerald-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <span className="block w-3 h-3 border border-slate-400 dark:border-slate-500 rounded-sm" />
                          )}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td
                    className={`sticky left-12 z-10 px-4 py-3 border-r border-slate-200 dark:border-slate-700 ${rowBg}`}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <a
                        href={`/recipe/${recipe.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                      >
                        {recipe.name}
                      </a>
                      {isRecipeNew(recipe.created_at) && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">
                          New
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${rowBg}`}>
                    <a
                      href={`/chef/${encodeURIComponent(recipe.chef)}`}
                      className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                    >
                      <ChefAvatar name={recipe.chef} size="sm" />
                      {recipe.chef}
                    </a>
                  </td>
                  <td className={`px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap ${rowBg}`}>
                    {recipe.type}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap ${rowBg}`}>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColor[recipe.difficulty]}`}
                    >
                      {recipe.difficulty}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap ${rowBg}`}>
                    {recipe.time || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

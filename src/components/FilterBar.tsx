"use client";

import { FilterState } from "@/lib/types";
import ChefAvatar from "./ChefAvatar";

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  chefs: string[];
  types: string[];
}

export default function FilterBar({
  filters,
  onFilterChange,
  chefs,
  types,
}: FilterBarProps) {
  const update = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.chef || filters.type || filters.difficulty || filters.status || filters.maxTime;

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Search recipes, ingredients..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-amber-200 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Chef toggle pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => update("chef", "")}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !filters.chef
              ? "bg-amber-500 text-white"
              : "bg-white border border-amber-200 text-stone-600 hover:bg-amber-50"
          }`}
        >
          All
        </button>
        {chefs.map((chef) => (
          <button
            key={chef}
            onClick={() => update("chef", filters.chef === chef ? "" : chef)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filters.chef === chef
                ? "bg-amber-500 text-white"
                : "bg-white border border-amber-200 text-stone-600 hover:bg-amber-50"
            }`}
          >
            <ChefAvatar name={chef} size="sm" linked={false} />
            {chef}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
          className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filters.difficulty}
          onChange={(e) => update("difficulty", e.target.value)}
          className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Any Difficulty</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <select
          value={filters.maxTime}
          onChange={(e) => update("maxTime", e.target.value)}
          className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">Any Time</option>
          <option value="15">Under 15 min</option>
          <option value="30">Under 30 min</option>
          <option value="45">Under 45 min</option>
          <option value="60">Under 1 hour</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">All Recipes</option>
          <option value="family-approved">Family Approved</option>
          <option value="want-to-try">Want to Try</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={() =>
              onFilterChange({
                search: filters.search,
                chef: "",
                type: "",
                difficulty: "",
                status: "",
                maxTime: "",
              })
            }
            className="px-3 py-2 text-sm text-amber-600 hover:text-amber-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

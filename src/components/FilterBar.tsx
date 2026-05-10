"use client";

import { useEffect, useRef, useState } from "react";
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
    filters.chef ||
    filters.type ||
    filters.difficulty ||
    filters.maxTime;

  return (
    <div className="flex items-center flex-wrap gap-2">
      <ChefDropdown
        chefs={chefs}
        value={filters.chef}
        onChange={(v) => update("chef", v)}
      />

      <FilterDropdown
        label={filters.type || "Any Type"}
        options={[
          { value: "", label: "Any Type" },
          ...types.map((t) => ({ value: t, label: t })),
        ]}
        value={filters.type}
        onChange={(v) => update("type", v)}
      />

      <FilterDropdown
        label={filters.difficulty || "Any Difficulty"}
        options={[
          { value: "", label: "Any Difficulty" },
          { value: "Easy", label: "Easy" },
          { value: "Medium", label: "Medium" },
          { value: "Hard", label: "Hard" },
        ]}
        value={filters.difficulty}
        onChange={(v) => update("difficulty", v)}
      />

      <FilterDropdown
        label={filters.maxTime ? `Under ${filters.maxTime} min` : "Any Time"}
        options={[
          { value: "", label: "Any Time" },
          { value: "15", label: "Under 15 min" },
          { value: "30", label: "Under 30 min" },
          { value: "45", label: "Under 45 min" },
          { value: "60", label: "Under 1 hour" },
        ]}
        value={filters.maxTime}
        onChange={(v) => update("maxTime", v)}
      />

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
          className="px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium shrink-0"
        >
          Clear
        </button>
      )}

      <div className="relative ml-auto flex-1 min-w-32 max-w-xs">
        <input
          type="text"
          placeholder="Search recipes..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
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
    </div>
  );
}

interface DropdownOption {
  value: string;
  label: string;
  icon?: string;
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap"
      >
        <span>{label}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 min-w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden whitespace-nowrap max-h-72 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                value === opt.value
                  ? "bg-slate-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-medium"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChefDropdown({
  chefs,
  value,
  onChange,
}: {
  chefs: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 whitespace-nowrap"
      >
        {value ? <ChefAvatar name={value} size="sm" linked={false} /> : null}
        <span>{value || "Any Chef"}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
              !value
                ? "bg-slate-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-medium"
                : "text-slate-700 dark:text-slate-200"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs">
              👨‍👩‍👧
            </span>
            Any Chef
          </button>
          <div className="max-h-64 overflow-y-auto">
            {chefs.map((chef) => (
              <button
                key={chef}
                type="button"
                onClick={() => {
                  onChange(chef);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  value === chef
                    ? "bg-slate-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-medium"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                <ChefAvatar name={chef} size="sm" linked={false} />
                {chef}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Recipe } from "@/lib/types";
import {
  MEAL_SLOTS,
  MealPlan,
  MealSlot,
  SLOT_ICON,
  SLOT_LABEL,
} from "@/lib/meal-plan-store";

const DRAG_MIME = "application/x-huish-meal-card";

interface DragPayload {
  recipeId: string;
  from?: { day: string; slot: MealSlot };
}

function readDrag(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function writeDrag(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = "move";
}

export type KanbanLayout = "kanban" | "list";

interface MealPlanKanbanProps {
  plan: MealPlan;
  recipesById: Map<string, Recipe>;
  layout?: KanbanLayout;
  onDrop: (
    recipeId: string,
    target: { day: string; slot: MealSlot },
    source?: { day: string; slot: MealSlot }
  ) => void | Promise<void>;
  onRemove: (
    day: string,
    slot: MealSlot,
    recipeId: string
  ) => void | Promise<void>;
  onAddClick: (day: string, slot: MealSlot) => void;
}

export default function MealPlanKanban({
  plan,
  recipesById,
  layout = "kanban",
  onDrop,
  onRemove,
  onAddClick,
}: MealPlanKanbanProps) {
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const toggleCollapsed = (day: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleDragOver = (cellKey: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setHoverCell(cellKey);
  };

  const handleDragLeave = (cellKey: string) => () => {
    setHoverCell((prev) => (prev === cellKey ? null : prev));
  };

  const handleDrop =
    (day: string, slot: MealSlot) => (e: React.DragEvent) => {
      e.preventDefault();
      setHoverCell(null);
      const payload = readDrag(e);
      if (!payload) return;
      if (
        payload.from &&
        payload.from.day === day &&
        payload.from.slot === slot
      ) {
        return;
      }
      onDrop(payload.recipeId, { day, slot }, payload.from);
    };

  const renderSlot = (
    day: string,
    slot: MealSlot,
    ids: string[],
    extraClass = ""
  ) => {
    const cellKey = `${day}:${slot}`;
    const isHovered = hoverCell === cellKey;
    return (
      <div
        key={slot}
        className={`p-2 min-h-[88px] transition-colors ${extraClass} ${
          isHovered
            ? "bg-emerald-100/70 dark:bg-emerald-900/30 ring-2 ring-emerald-400 ring-inset"
            : ""
        }`}
        onDragOver={handleDragOver(cellKey)}
        onDragEnter={handleDragOver(cellKey)}
        onDragLeave={handleDragLeave(cellKey)}
        onDrop={handleDrop(day, slot)}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            <span>{SLOT_ICON[slot]}</span>
            {SLOT_LABEL[slot]}
          </span>
          <button
            onClick={() => onAddClick(day, slot)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-medium leading-none px-1"
            aria-label={`Add to ${day} ${slot}`}
          >
            +
          </button>
        </div>

        {ids.length === 0 ? (
          <p className="text-xs text-slate-300 dark:text-slate-600 italic pointer-events-none">
            Drop or tap +
          </p>
        ) : (
          <div className="space-y-1.5">
            {ids.map((id, idx) => {
              const recipe = recipesById.get(id);
              if (!recipe) return null;
              return (
                <div
                  key={`${id}-${idx}`}
                  draggable
                  onDragStart={(e) =>
                    writeDrag(e, {
                      recipeId: id,
                      from: { day, slot },
                    })
                  }
                  className="group flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 cursor-grab active:cursor-grabbing select-none"
                >
                  <div
                    className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 pointer-events-none"
                    aria-hidden
                  >
                    {recipe.photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={recipe.photo}
                        alt=""
                        draggable={false}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        🍽️
                      </div>
                    )}
                  </div>
                  <span
                    className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate flex-1 leading-tight"
                    title={recipe.name}
                  >
                    {recipe.name}
                  </span>
                  <a
                    href={`/recipe/${recipe.id}`}
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Open recipe"
                    title="Open recipe"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      />
                    </svg>
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemove(day, slot, id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (layout === "list") {
    return (
      <div className="space-y-3">
        {plan.map((day) => {
          const isCollapsed = collapsedDays.has(day.day);
          const total =
            day.slots.breakfast.length +
            day.slots.lunch.length +
            day.slots.dinner.length;
          return (
            <div
              key={day.day}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCollapsed(day.day)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
                aria-expanded={!isCollapsed}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${
                      isCollapsed ? "" : "rotate-90"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {day.day}
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {total === 0
                    ? "Nothing planned"
                    : `${total} meal${total !== 1 ? "s" : ""}`}
                </span>
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {MEAL_SLOTS.map((slot) =>
                    renderSlot(day.day, slot, day.slots[slot], "px-3")
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Kanban layout: horizontal swimlanes
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-3 min-w-full">
        {plan.map((day) => (
          <div
            key={day.day}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col"
          >
            <div className="px-3 py-2 bg-slate-50/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {day.day}
              </h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
              {MEAL_SLOTS.map((slot) =>
                renderSlot(day.day, slot, day.slots[slot])
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Draggable chip used by both PendingTray and SuggestionsTray
// ─────────────────────────────────────────────────────────────────

interface ChipProps {
  recipe: Recipe;
  onRemove?: (id: string) => void;
}

function RecipeChip({ recipe, onRemove }: ChipProps) {
  return (
    <div
      draggable
      onDragStart={(e) => writeDrag(e, { recipeId: recipe.id })}
      className="group inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-full pl-1 pr-2 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-grab active:cursor-grabbing shadow-sm select-none"
    >
      <div
        className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden pointer-events-none"
        aria-hidden
      >
        {recipe.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={recipe.photo}
            alt=""
            draggable={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px]">
            🍽️
          </div>
        )}
      </div>
      <span className="max-w-[160px] truncate">{recipe.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(recipe.id)}
          onMouseDown={(e) => e.stopPropagation()}
          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove from tray"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Pending tray (cards from "Add to meal plan" multi-select)
// ─────────────────────────────────────────────────────────────────

interface PendingTrayProps {
  pending: Recipe[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

export function PendingTray({ pending, onClear, onRemove }: PendingTrayProps) {
  if (pending.length === 0) return null;
  return (
    <div className="bg-slate-50 dark:bg-emerald-950/30 border border-slate-300 dark:border-emerald-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            {pending.length} recipe{pending.length !== 1 ? "s" : ""} ready to drop
          </p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
            Drag any card onto the day + meal you want it on
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pending.map((recipe) => (
          <RecipeChip
            key={recipe.id}
            recipe={recipe}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Suggestions tray (drag-and-droppable starter ideas)
// ─────────────────────────────────────────────────────────────────

interface SuggestionsTrayProps {
  suggestions: Recipe[];
}

export function SuggestionsTray({ suggestions }: SuggestionsTrayProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            ✨ Suggested for this week
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag any card onto a day + meal slot
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((recipe) => (
          <RecipeChip key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}

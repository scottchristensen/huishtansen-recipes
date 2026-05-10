"use client";

import { useEffect, useState } from "react";
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

// Module-level fallback for the in-flight drag payload. Custom MIME types are
// sometimes stripped by the browser (e.g. when the drop target is in a
// different document or sandboxed iframe), and `dataTransfer.getData()` is
// also blank during `dragover` in most browsers — so we keep a copy here that
// always works for same-tab drags.
let activeDragPayload: DragPayload | null = null;

function readDrag(e: React.DragEvent): DragPayload | null {
  if (activeDragPayload) return activeDragPayload;
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (raw) return JSON.parse(raw) as DragPayload;
  } catch {
    // ignore
  }
  return null;
}

function writeDrag(e: React.DragEvent, payload: DragPayload) {
  activeDragPayload = payload;
  try {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
    // text/plain is a near-universal fallback that almost no browser blocks.
    e.dataTransfer.setData("text/plain", payload.recipeId);
  } catch {
    // some test environments (jsdom) reject setData
  }
  e.dataTransfer.effectAllowed = "move";
}

function clearActiveDrag() {
  activeDragPayload = null;
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
    const isEmpty = ids.length === 0;

    if (isEmpty) {
      return (
        <div
          key={slot}
          role="button"
          tabIndex={0}
          onClick={() => onAddClick(day, slot)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAddClick(day, slot);
            }
          }}
          onDragOver={handleDragOver(cellKey)}
          onDragEnter={handleDragOver(cellKey)}
          onDragLeave={handleDragLeave(cellKey)}
          onDrop={handleDrop(day, slot)}
          className={`group w-full text-left p-2 min-h-[88px] transition-colors cursor-pointer ${extraClass} ${
            isHovered
              ? "bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-400 dark:ring-slate-500 ring-inset"
              : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
          }`}
          aria-label={`Add a recipe to ${day} ${SLOT_LABEL[slot]}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <span>{SLOT_ICON[slot]}</span>
              {SLOT_LABEL[slot]}
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 italic group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add a recipe
          </p>
        </div>
      );
    }

    return (
      <div
        key={slot}
        className={`p-2 min-h-[88px] transition-colors ${extraClass} ${
          isHovered
            ? "bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-400 dark:ring-slate-500 ring-inset"
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
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-0.5"
            aria-label={`Add to ${day} ${slot}`}
            title="Add another recipe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {ids.length > 0 && (
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
                  onDragEnd={clearActiveDrag}
                  className="group flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 cursor-grab active:cursor-grabbing select-none"
                >
                  <div
                    className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0"
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
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
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
      onDragEnd={clearActiveDrag}
      className="group inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-full pl-1 pr-2 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-grab active:cursor-grabbing shadow-sm select-none hover:border-emerald-400"
    >
      <div
        className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
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

export function PendingTray({
  pending,
  onClear,
  onRemove,
}: PendingTrayProps) {
  if (pending.length === 0) return null;
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {pending.length} recipe{pending.length !== 1 ? "s" : ""} ready to drop
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Drag any card onto the day + meal you want it on
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-600 dark:text-slate-300 hover:underline"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pending.map((recipe) => (
          <RecipeChip key={recipe.id} recipe={recipe} onRemove={onRemove} />
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

const SUGGESTIONS_COLLAPSED_KEY = "huish-suggestions-collapsed";

export function SuggestionsTray({ suggestions }: SuggestionsTrayProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCollapsed(
      window.localStorage.getItem(SUGGESTIONS_COLLAPSED_KEY) === "1"
    );
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(
          SUGGESTIONS_COLLAPSED_KEY,
          next ? "1" : "0"
        );
      } catch {}
      return next;
    });
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        className="w-full flex items-start justify-between gap-3 text-left group"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
            ✨ Suggested for this week
            {collapsed && (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({suggestions.length})
              </span>
            )}
          </p>
          {!collapsed && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag any card onto the day + meal you want it on
            </p>
          )}
        </div>
        <svg
          className={`w-4 h-4 shrink-0 mt-1 text-slate-400 dark:text-slate-500 transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {!collapsed && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((recipe) => (
            <RecipeChip key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}

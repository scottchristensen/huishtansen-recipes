"use client";

import { useState } from "react";
import { Recipe } from "@/lib/types";
import {
  DAYS,
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

interface MealPlanKanbanProps {
  plan: MealPlan;
  recipesById: Map<string, Recipe>;
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
  onDrop,
  onRemove,
  onAddClick,
}: MealPlanKanbanProps) {
  const [hoverCell, setHoverCell] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="grid grid-flow-col auto-cols-[minmax(180px,1fr)] gap-3 min-w-full">
        {plan.map((day) => (
          <div
            key={day.day}
            className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 overflow-hidden flex flex-col"
          >
            <div className="px-3 py-2 bg-emerald-50/70 dark:bg-slate-800/70 border-b border-emerald-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {day.day}
              </h3>
            </div>
            <div className="divide-y divide-emerald-50 dark:divide-slate-800 flex-1">
              {MEAL_SLOTS.map((slot) => {
                const cellKey = `${day.day}:${slot}`;
                const ids = day.slots[slot];
                const isHovered = hoverCell === cellKey;
                return (
                  <div
                    key={slot}
                    className={`p-2 min-h-[88px] transition-colors ${
                      isHovered
                        ? "bg-emerald-100/70 dark:bg-emerald-900/30 ring-2 ring-emerald-400 ring-inset"
                        : ""
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setHoverCell(cellKey);
                    }}
                    onDragLeave={() => {
                      setHoverCell((prev) => (prev === cellKey ? null : prev));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setHoverCell(null);
                      const payload = readDrag(e);
                      if (!payload) return;
                      // No-op if dropped on its source slot
                      if (
                        payload.from &&
                        payload.from.day === day.day &&
                        payload.from.slot === slot
                      ) {
                        return;
                      }
                      onDrop(
                        payload.recipeId,
                        { day: day.day, slot },
                        payload.from
                      );
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                        <span>{SLOT_ICON[slot]}</span>
                        {SLOT_LABEL[slot]}
                      </span>
                      <button
                        onClick={() => onAddClick(day.day, slot)}
                        className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-medium leading-none px-1"
                        aria-label={`Add to ${day.day} ${slot}`}
                      >
                        +
                      </button>
                    </div>

                    {ids.length === 0 ? (
                      <p className="text-xs text-slate-300 dark:text-slate-600 italic">
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
                                  from: { day: day.day, slot },
                                })
                              }
                              className="group flex items-center gap-2 bg-emerald-50 dark:bg-slate-800 border border-emerald-100 dark:border-slate-700 rounded-md p-1.5 cursor-grab active:cursor-grabbing"
                            >
                              <div className="w-7 h-7 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                                {recipe.photo ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={recipe.photo}
                                    alt=""
                                    className="w-full h-full object-cover pointer-events-none"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">
                                    🍽️
                                  </div>
                                )}
                              </div>
                              <a
                                href={`/recipe/${recipe.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 truncate flex-1 leading-tight"
                                title={recipe.name}
                              >
                                {recipe.name}
                              </a>
                              <button
                                onClick={() => onRemove(day.day, slot, id)}
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
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PendingTrayProps {
  pending: Recipe[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

export function PendingTray({ pending, onClear, onRemove }: PendingTrayProps) {
  if (pending.length === 0) return null;
  return (
    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
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
          <div
            key={recipe.id}
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData(
                DRAG_MIME,
                JSON.stringify({ recipeId: recipe.id })
              )
            }
            className="group inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 rounded-full pl-1 pr-2 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-grab active:cursor-grabbing shadow-sm"
          >
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              {recipe.photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={recipe.photo}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px]">
                  🍽️
                </div>
              )}
            </div>
            <span className="max-w-[160px] truncate">{recipe.name}</span>
            <button
              onClick={() => onRemove(recipe.id)}
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove from pending"
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
          </div>
        ))}
      </div>
    </div>
  );
}

// Re-export so the page's slot picker can use the same name shape
export { DAYS };

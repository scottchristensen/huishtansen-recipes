"use client";

import { useEffect, useRef, useState } from "react";

const FAMILY_MEMBERS: { name: string; emoji: string }[] = [
  { name: "Olivia", emoji: "👩‍🎨" },
  { name: "Darcey", emoji: "👸" },
  { name: "Annika", emoji: "🧑‍🍳" },
  { name: "Emma", emoji: "👩‍💼" },
  { name: "Isabel", emoji: "👩" },
  { name: "Scott", emoji: "🚴‍♂️" },
  { name: "Michael", emoji: "👨‍⚕️" },
  { name: "Sam", emoji: "👨‍💼" },
  { name: "Karl", emoji: "🤴" },
  { name: "Cannon", emoji: "👦" },
  { name: "Lydia", emoji: "👧" },
];

interface ChefSelectProps {
  value: string;
  onChange: (chef: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function ChefSelect({
  value,
  onChange,
  placeholder = "Pick a chef",
  className = "",
  disabled,
}: ChefSelectProps) {
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

  const selected = FAMILY_MEMBERS.find((m) => m.name === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="text-base">{selected.emoji}</span>
            <span>{selected.name}</span>
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">
            {placeholder}
          </span>
        )}
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
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {FAMILY_MEMBERS.map(({ name, emoji }) => {
            const isMe = name === value;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  isMe
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-base w-6 text-center">{emoji}</span>
                <span className="flex-1">{name}</span>
                {isMe && (
                  <svg
                    className="w-4 h-4 text-emerald-500"
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
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

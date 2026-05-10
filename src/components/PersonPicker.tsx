"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, setCurrentUser } from "@/lib/meal-plan-store";
import { useAuth } from "@/lib/auth-context";

const FAMILY_MEMBERS = [
  { name: "Olivia", emoji: "👩‍🍳" },
  { name: "Darcey", emoji: "👩" },
  { name: "Annika", emoji: "🧑‍🍳" },
  { name: "Emma", emoji: "👧" },
  { name: "Isabel", emoji: "👶" },
  { name: "Scott", emoji: "👨‍🍳" },
];

interface PersonPickerProps {
  onSelect: (name: string) => void;
}

export default function PersonPicker({ onSelect }: PersonPickerProps) {
  const { profile } = useAuth();
  const [current, setCurrent] = useState("");

  useEffect(() => {
    const saved = getCurrentUser();
    if (saved) {
      setCurrent(saved);
    } else if (profile?.chef_name) {
      // Auto-select the signed-in user
      setCurrentUser(profile.chef_name);
      setCurrent(profile.chef_name);
      onSelect(profile.chef_name);
    }
  }, [profile, onSelect]);

  const handleSelect = (name: string) => {
    setCurrentUser(name);
    setCurrent(name);
    onSelect(name);
  };

  if (current) {
    const member = FAMILY_MEMBERS.find((m) => m.name === current);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">Planning as</span>
        <button
          onClick={() => {
            setCurrentUser("");
            setCurrent("");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded-full text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-700 transition-colors"
        >
          <span>{member?.emoji || "🍴"}</span>
          {current}
          <svg
            className="w-3.5 h-3.5 text-emerald-500"
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
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-5 text-center">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Who&apos;s cooking?</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
        Pick your name to create and view meal plans
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {FAMILY_MEMBERS.map((member) => (
          <button
            key={member.name}
            onClick={() => handleSelect(member.name)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors"
          >
            <span className="text-lg">{member.emoji}</span>
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
}

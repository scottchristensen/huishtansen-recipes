"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, setCurrentUser } from "@/lib/meal-plan-store";

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
  const [current, setCurrent] = useState("");

  useEffect(() => {
    setCurrent(getCurrentUser());
  }, []);

  const handleSelect = (name: string) => {
    setCurrentUser(name);
    setCurrent(name);
    onSelect(name);
  };

  if (current) {
    const member = FAMILY_MEMBERS.find((m) => m.name === current);
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-500">Planning as</span>
        <button
          onClick={() => {
            setCurrentUser("");
            setCurrent("");
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors"
        >
          <span>{member?.emoji || "🍴"}</span>
          {current}
          <svg
            className="w-3.5 h-3.5 text-amber-500"
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
    <div className="bg-white rounded-xl border border-amber-100 p-5 text-center">
      <h3 className="font-semibold text-stone-900 mb-1">Who&apos;s cooking?</h3>
      <p className="text-sm text-stone-400 mb-4">
        Pick your name to create and view meal plans
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {FAMILY_MEMBERS.map((member) => (
          <button
            key={member.name}
            onClick={() => handleSelect(member.name)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium text-stone-700 hover:bg-amber-100 hover:border-amber-300 transition-colors"
          >
            <span className="text-lg">{member.emoji}</span>
            {member.name}
          </button>
        ))}
      </div>
    </div>
  );
}

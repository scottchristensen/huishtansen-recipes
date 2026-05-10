"use client";

import { useEffect, useState } from "react";
import { authenticate, isAuthenticated } from "@/lib/recipes-store";
import { getCurrentUser, setCurrentUser } from "@/lib/meal-plan-store";

const FAMILY_MEMBERS = [
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

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthed(ok);
    if (ok && !getCurrentUser()) setNeedsName(true);
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-emerald-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (authed && !needsName) return <>{children}</>;

  if (authed && needsName) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Who&apos;s using the app?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Pick your name. You can change it later.
          </p>
          {(() => {
            const kidNames = new Set(["Cannon", "Lydia"]);
            const adults = FAMILY_MEMBERS.filter((m) => !kidNames.has(m.name));
            const kids = FAMILY_MEMBERS.filter((m) => kidNames.has(m.name));
            const buttonClasses =
              "flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-slate-700 hover:border-emerald-300 transition-colors";
            const onPick = (name: string) => {
              setCurrentUser(name);
              setNeedsName(false);
            };
            return (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {adults.map((member) => (
                    <button
                      key={member.name}
                      onClick={() => onPick(member.name)}
                      className={buttonClasses}
                    >
                      <span className="text-lg">{member.emoji}</span>
                      {member.name}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {kids.map((member) => (
                    <button
                      key={member.name}
                      onClick={() => onPick(member.name)}
                      className={buttonClasses}
                    >
                      <span className="text-lg">{member.emoji}</span>
                      {member.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticate(code)) {
      setAuthed(true);
      setError(false);
      if (!getCurrentUser()) setNeedsName(true);
    } else {
      setError(true);
      setCode("");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🍳</div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
          Huishtansen Eats
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Enter the family code to get cooking
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(false);
            }}
            placeholder="Family code"
            autoFocus
            className={`w-full h-12 px-4 text-center text-base tracking-widest bg-emerald-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              error
                ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40"
                : "border-emerald-200 dark:border-slate-700"
            }`}
          />
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm">
              Hmm, that&apos;s not it. Try again!
            </p>
          )}
          <button
            type="submit"
            className="w-full h-12 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Enter Kitchen
          </button>
        </form>
      </div>
    </div>
  );
}

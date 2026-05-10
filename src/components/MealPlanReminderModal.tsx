"use client";

import { useEffect, useState } from "react";
import {
  ReminderPrefs,
  getReminder,
  saveReminder,
} from "@/lib/meal-plan-store";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface MealPlanReminderModalProps {
  planner: string;
  defaultEmail?: string;
  open: boolean;
  onClose: () => void;
}

export default function MealPlanReminderModal({
  planner,
  defaultEmail = "",
  open,
  onClose,
}: MealPlanReminderModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [email, setEmail] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0); // Sunday default
  const [timeOfDay, setTimeOfDay] = useState("19:00");
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (!open || !planner) return;
    setLoading(true);
    getReminder(planner).then((existing) => {
      if (existing) {
        setEnabled(existing.enabled);
        setEmail(existing.email);
        setDayOfWeek(existing.day_of_week);
        // Trim seconds if Postgres returned "HH:MM:SS"
        setTimeOfDay(existing.time_of_day.slice(0, 5));
      } else {
        setEnabled(true);
        setEmail(defaultEmail);
        setDayOfWeek(0);
        setTimeOfDay("19:00");
      }
      setLoading(false);
    });
  }, [open, planner, defaultEmail]);

  if (!open) return null;

  const handleSave = async () => {
    if (!email) return;
    setSaving(true);
    const prefs: ReminderPrefs = {
      planner,
      email,
      day_of_week: dayOfWeek,
      time_of_day: timeOfDay,
      enabled,
    };
    const ok = await saveReminder(prefs);
    setSaving(false);
    if (ok) {
      setSavedToast(true);
      setTimeout(() => {
        setSavedToast(false);
        onClose();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-full p-2 shrink-0">
            <svg
              className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Weekly meal plan reminder
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Get an email with suggestions before your week starts.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-emerald-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Reminders enabled
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Toggle to pause without losing settings
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enabled
                    ? "bg-emerald-500"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
                aria-pressed={enabled}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Day
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
              Email delivery isn&apos;t hooked up yet — Resend will read these
              preferences once it&apos;s wired in.
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading || !email}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {savedToast ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

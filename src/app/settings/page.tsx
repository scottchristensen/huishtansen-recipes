"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import AuthGate from "@/components/AuthGate";
import { Theme, getStoredTheme, setTheme } from "@/lib/theme";

interface NotificationPrefs {
  emailFamilyActivity: boolean;
  mealPlanReminders: boolean;
  weeklyDigest: boolean;
}

const NOTIF_KEY = "huish-notification-prefs";
const DEFAULT_NOTIFS: NotificationPrefs = {
  emailFamilyActivity: true,
  mealPlanReminders: true,
  weeklyDigest: false,
};

export default function SettingsPage() {
  const router = useRouter();
  const { session, profile, setProfile, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [notifs, setNotifs] = useState<NotificationPrefs>(DEFAULT_NOTIFS);
  const [savedFlash, setSavedFlash] = useState(false);
  const [theme, setThemeState] = useState<Theme>("system");

  useEffect(() => {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) {
      try {
        setNotifs({ ...DEFAULT_NOTIFS, ...JSON.parse(raw) });
      } catch {}
    }
    setThemeState(getStoredTheme());
  }, []);

  const updateTheme = (next: Theme) => {
    setThemeState(next);
    setTheme(next);
  };

  const updateNotif = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...notifs, [key]: value };
    setNotifs(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/profile-${profile.id}.${ext}`;
    await supabase.storage.from("recipe-photos").upload(path, file, {
      contentType: file.type,
      upsert: true,
    });
    const { data: urlData } = supabase.storage
      .from("recipe-photos")
      .getPublicUrl(path);
    const newUrl = urlData.publicUrl + "?t=" + Date.now();
    await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("id", profile.id);
    setProfile({ ...profile, avatar_url: newUrl });
    setUploading(false);
    e.target.value = "";
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <AuthGate>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <button
            onClick={() => router.back()}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 text-sm font-medium mb-3 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your profile, notifications, and account
          </p>
        </div>

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Profile
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden flex items-center justify-center text-2xl">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.chef_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  "👤"
                )}
              </div>
              <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">
                  {uploading ? "..." : "Change"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleAvatarUpload}
                />
              </label>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {profile?.chef_name || "—"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your chef name is tied to your family role and can&apos;t be changed
            here. Edit your bio and stats on{" "}
            <a
              href={`/chef/${profile?.chef_name}`}
              className="text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              your chef page
            </a>
            .
          </p>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </h2>
            {savedFlash && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Saved
              </span>
            )}
          </div>
          <div className="space-y-4">
            <Toggle
              label="Family activity emails"
              description="When someone in your family adds or approves a recipe"
              checked={notifs.emailFamilyActivity}
              onChange={(v) => updateNotif("emailFamilyActivity", v)}
            />
            <Toggle
              label="Meal plan reminders"
              description="Gentle nudges when your weekly plan is empty"
              checked={notifs.mealPlanReminders}
              onChange={(v) => updateNotif("mealPlanReminders", v)}
            />
            <Toggle
              label="Weekly digest"
              description="A roundup of new recipes added each Sunday"
              checked={notifs.weeklyDigest}
              onChange={(v) => updateNotif("weeklyDigest", v)}
            />
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Appearance
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Choose how the app looks. System matches your device.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "light", label: "Light", icon: "☀️" },
                { value: "dark", label: "Dark", icon: "🌙" },
                { value: "system", label: "System", icon: "🖥️" },
              ] as const
            ).map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateTheme(opt.value)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  aria-pressed={active}
                >
                  <span className="text-xl">{opt.icon}</span>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Account
          </h2>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            Sign out
          </button>
        </section>
      </div>
    </AuthGate>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {label}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors mt-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 ${
          checked
            ? "bg-emerald-500"
            : "bg-slate-300 dark:bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useAuth, createProfile } from "@/lib/auth-context";

const FAMILY_MEMBERS = [
  { name: "Olivia", emoji: "👩‍🍳" },
  { name: "Darcey", emoji: "👩" },
  { name: "Annika", emoji: "🧑‍🍳" },
  { name: "Emma", emoji: "👧" },
  { name: "Isabel", emoji: "👶" },
  { name: "Scott", emoji: "👨‍🍳" },
];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, user, profile, loading, signInWithGoogle, setProfile } =
    useAuth();
  const [pickingName, setPickingName] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // QA bypass: skip auth entirely when env flag is set
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH === "true") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-300 dark:border-emerald-700 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in — show Google sign-in
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🍳</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Huishtansen Eats
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Sign in with your Google account to access recipes
          </p>

          <button
            onClick={async () => {
              setSigningIn(true);
              await signInWithGoogle();
            }}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-3 px-4 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {signingIn ? "Redirecting..." : "Sign in with Google"}
          </button>
        </div>
      </div>
    );
  }

  // Signed in but no profile yet — pick your family name
  if (!profile || pickingName) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">👋</div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            Welcome, {user?.user_metadata?.full_name?.split(" ")[0] || "Chef"}!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Which family member are you?
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {FAMILY_MEMBERS.map((member) => (
              <button
                key={member.name}
                onClick={async () => {
                  const newProfile = await createProfile(
                    user!.id,
                    member.name,
                    user!.email ?? null,
                    user!.user_metadata?.avatar_url ?? null
                  );
                  if (newProfile) {
                    setProfile(newProfile);
                    setPickingName(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-300 transition-colors"
              >
                <span className="text-lg">{member.emoji}</span>
                {member.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

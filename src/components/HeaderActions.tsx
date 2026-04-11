"use client";

import { useAuth } from "@/lib/auth-context";

export default function HeaderActions() {
  const { session, profile, signOut } = useAuth();

  if (!session) return null;

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="flex items-center gap-2">
      <a
        href="/meal-plan"
        className="text-amber-100 hover:text-white text-sm font-medium px-2 py-2 transition-colors inline"
        title="Meal Plan"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </a>
      <a
        href="/import"
        className="text-amber-100 hover:text-white text-sm font-medium px-2 py-2 transition-colors inline"
        title="Import from URL"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </a>
      <a
        href="/add"
        className="bg-white text-amber-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-colors"
      >
        + Add
      </a>
      {profile && (
        <a
          href={`/chef/${profile.chef_name}`}
          className="text-amber-100 hover:text-white text-sm font-medium px-2 py-2 transition-colors"
          title={profile.chef_name}
        >
          <span className="text-lg">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.chef_name}
                className="w-6 h-6 rounded-full inline"
              />
            ) : (
              "👤"
            )}
          </span>
        </a>
      )}
      <button
        onClick={handleLogout}
        className="text-amber-100 hover:text-white text-sm font-medium px-2 py-2 transition-colors"
        title="Sign out"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  );
}

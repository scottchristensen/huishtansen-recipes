"use client";

import { useState, useEffect } from "react";
import { isAuthenticated, logout } from "@/lib/recipes-store";

export default function HeaderActions() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const handleLogout = () => {
    logout();
    setAuthed(false);
    window.location.reload();
  };

  if (!authed) return null;

  return (
    <div className="flex items-center gap-2">
      <a
        href="/import"
        className="text-amber-100 hover:text-white text-sm font-medium px-2 py-2 transition-colors hidden sm:inline"
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
      <button
        onClick={handleLogout}
        className="text-amber-100 hover:text-white text-sm font-medium px-2 py-2 transition-colors"
        title="Log out"
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

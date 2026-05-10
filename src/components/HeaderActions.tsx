"use client";

import { useEffect, useRef, useState } from "react";
import {
  AUTH_CHANGE_EVENT,
  isAuthenticated,
  logout,
} from "@/lib/recipes-store";
import { getCurrentUser, setCurrentUser } from "@/lib/meal-plan-store";
import ChefAvatar from "./ChefAvatar";

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

type Panel = "main" | "switch";

export default function HeaderActions() {
  const [authed, setAuthed] = useState(false);
  const [chefName, setChefName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>("main");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      setAuthed(isAuthenticated());
      setChefName(getCurrentUser());
    };
    refresh();
    window.addEventListener(AUTH_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, refresh);
  }, []);

  // Outside-click for desktop popover. The mobile sheet handles its own
  // close via the backdrop and explicit close button so we don't double-up.
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      // skip if click was inside the menu/avatar
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      // only auto-close on desktop; mobile uses the backdrop
      if (window.matchMedia("(min-width: 640px)").matches) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Lock body scroll when the mobile sheet is open
  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    const isMobile = !window.matchMedia("(min-width: 640px)").matches;
    if (isMobile) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  if (!authed) return null;

  const closeMenu = () => {
    setMenuOpen(false);
    setPanel("main");
  };

  const handleLogout = () => {
    closeMenu();
    logout();
    window.location.href = "/";
  };

  const handlePickName = (name: string) => {
    setCurrentUser(name);
    setChefName(name);
    closeMenu();
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors p-0.5 sm:pr-3"
          title={chefName || "Account"}
          aria-label="Account menu"
        >
          {chefName ? (
            <ChefAvatar name={chefName} size="md" linked={false} />
          ) : (
            <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-base">
              👤
            </span>
          )}
          <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
            {chefName || "Account"}
          </span>
        </button>

        {menuOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="sm:hidden fixed inset-0 bg-slate-900/40 z-40"
              onClick={closeMenu}
              aria-hidden
            />
            <div
              className={[
                // Mobile: full-screen sheet
                "fixed inset-x-0 top-0 bottom-0 z-50 bg-white dark:bg-slate-900 flex flex-col",
                // Desktop: anchored popover
                "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:rounded-xl sm:border sm:border-slate-200 sm:dark:border-slate-700 sm:shadow-lg sm:overflow-hidden sm:bg-white sm:dark:bg-slate-900",
              ].join(" ")}
              role="dialog"
              aria-modal="true"
            >
              {panel === "main" ? (
                <>
                  {/* Mobile-only close button */}
                  <div className="sm:hidden flex justify-end px-2 pt-2">
                    <button
                      type="button"
                      onClick={closeMenu}
                      aria-label="Close"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto sm:pt-1">
                    <button
                      type="button"
                      onClick={() => setPanel("switch")}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 sm:py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Switch user
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {chefName && (
                      <a
                        href={`/chef/${chefName}`}
                        onClick={closeMenu}
                        className="flex items-center gap-2 px-4 py-3 sm:py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        View profile
                      </a>
                    )}
                    <a
                      href="/settings"
                      onClick={closeMenu}
                      className="flex items-center gap-2 px-4 py-3 sm:py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-t border-slate-200 dark:border-slate-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </a>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 sm:py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border-t border-slate-200 dark:border-slate-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Switch user panel */}
                  <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPanel("main")}
                      aria-label="Back"
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1 -ml-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Switch user
                    </p>
                    <button
                      type="button"
                      onClick={closeMenu}
                      aria-label="Close"
                      className="sm:hidden ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto py-1">
                    {FAMILY_MEMBERS.map(({ name, emoji }) => {
                      const isMe = name === chefName;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handlePickName(name)}
                          className={`w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm text-left transition-colors ${
                            isMe
                              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="text-lg w-7 text-center">{emoji}</span>
                          <span className="flex-1">{name}</span>
                          {isMe && (
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

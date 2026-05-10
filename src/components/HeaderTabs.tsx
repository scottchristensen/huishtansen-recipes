"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Recipes", match: (p: string) => p === "/" },
  {
    href: "/meal-plan",
    label: "Plan",
    match: (p: string) => p.startsWith("/meal-plan"),
  },
  {
    href: "/cook",
    label: "Cook",
    match: (p: string) => p.startsWith("/cook"),
  },
  {
    href: "/grocery-list",
    label: "Groceries",
    match: (p: string) => p.startsWith("/grocery-list"),
  },
];

export default function HeaderTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? "text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}

"use client";

import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Recipes" },
  { href: "/meal-plan", label: "Meal Plan" },
];

export default function TabNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-emerald-100 dark:border-slate-700">
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${
              active
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </div>
  );
}

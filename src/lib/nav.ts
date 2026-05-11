"use client";

import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

// router.back() silently no-ops when there is no history (e.g. when the user
// refreshed, opened a deep link in a new tab, or clicked an in-app link that
// replaces history). Fall back to a known route in those cases so Back always
// goes somewhere instead of looking like a hang.
export function safeBack(router: Router, fallback: string = "/") {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
  } else {
    router.push(fallback);
  }
}

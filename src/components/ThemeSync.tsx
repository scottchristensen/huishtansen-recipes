"use client";

import { useEffect } from "react";
import { applyTheme, getStoredTheme } from "@/lib/theme";

export default function ThemeSync() {
  useEffect(() => {
    applyTheme(getStoredTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onSystemChange);

    const onThemeChange = () => applyTheme(getStoredTheme());
    window.addEventListener("huish-theme-change", onThemeChange);
    window.addEventListener("storage", onThemeChange);

    return () => {
      mq.removeEventListener("change", onSystemChange);
      window.removeEventListener("huish-theme-change", onThemeChange);
      window.removeEventListener("storage", onThemeChange);
    };
  }, []);

  return null;
}

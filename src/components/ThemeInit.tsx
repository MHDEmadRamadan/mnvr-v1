"use client";

import { useLayoutEffect } from "react";

const STORAGE_KEY = "theme";

function resolveTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // ignore
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/** Applies saved theme before paint without a <script> in the React tree. */
export function ThemeInit() {
  useLayoutEffect(() => {
    const theme = resolveTheme();
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, []);

  return null;
}

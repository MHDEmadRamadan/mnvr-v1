"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";

function pageTitleFromPath(pathname: string) {
  if (pathname === "/issues") return "Issues";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

export function Header() {
  const pathname = usePathname() || "/";
  const title = pageTitleFromPath(pathname);
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
          <span className="hidden text-xs text-gray-500 dark:text-gray-400 sm:inline">
            MNVR device maintenance
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/issues"
            className="hidden rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 md:inline"
          >
            Go to Issues
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="text-base leading-none" suppressHydrationWarning>
              {!mounted ? "◐" : theme === "dark" ? "🌙" : "☀️"}
            </span>
            <span className="hidden sm:inline" suppressHydrationWarning>
              {!mounted ? "Theme" : theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

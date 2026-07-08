"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

function pageTitleFromPath(pathname: string) {
  if (pathname === "/issues") return "Issues";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/profile")) return "My Profile";
  if (pathname.startsWith("/settings")) return "My Profile";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname === "/unauthorized") return "Access Denied";
  return "Dashboard";
}

export function Header() {
  const pathname = usePathname() || "/";
  const title = pageTitleFromPath(pathname);
  const { theme, toggleTheme, mounted } = useTheme();
  const { profile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
  }

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
          {profile && (
            <Link
              href="/profile"
              className="hidden text-right text-xs hover:underline sm:block"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {profile.fullName || profile.email}
              </div>
              <div className="text-gray-500 capitalize dark:text-gray-400">{profile.role}</div>
            </Link>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="hidden rounded-md px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-200 dark:hover:bg-gray-800 md:inline"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
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

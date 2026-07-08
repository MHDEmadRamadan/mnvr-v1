"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = { href: string; label: string; adminOnly?: boolean };

const BASE_NAV: NavItem[] = [
  { href: "/issues", label: "Issues" },
  { href: "/reports", label: "Reports", adminOnly: true },
  { href: "/profile", label: "Profile" },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname() || "/";
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useAuth();
  const widthClass = collapsed ? "w-16" : "w-64";

  const nav = useMemo(
    () => BASE_NAV.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin],
  );

  const items = nav.map((item) => ({
    ...item,
    active: isActive(pathname, item.href),
  }));

  return (
    <aside
      className={[
        "sticky top-0 z-40 h-screen shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900",
        widthClass,
      ].join(" ")}
    >
      <div className="flex h-14 items-center justify-between px-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
            IM
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                Issues Manager
              </div>
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                Dashboard
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="px-2 py-3">
        <div className="space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                item.active
                  ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800",
              ].join(" ")}
            >
              <span className="text-base leading-none">
                {item.label === "Issues"
                  ? "🧩"
                  : item.label === "Reports"
                    ? "📊"
                    : item.label === "Users"
                      ? "👥"
                      : item.label === "Profile"
                        ? "👤"
                        : "⚙️"}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          v1 • Supabase
        </div>
      )}
    </aside>
  );
}


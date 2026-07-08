"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const PUBLIC_PATHS = new Set(["/login"]);
const UNAUTHORIZED_PATH = "/unauthorized";

function isAdminOnlyPath(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/reports");
}

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { loading, isAuthenticated, isAdmin, initError, retryInit, signOut } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.has(pathname);
  const isUnauthorizedPage = pathname === UNAUTHORIZED_PATH;
  const requiresAdmin = isAdminOnlyPath(pathname);

  useEffect(() => {
    if (loading || initError) return;

    if (!isAuthenticated && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && requiresAdmin && !isAdmin && !isUnauthorizedPage) {
      router.replace(UNAUTHORIZED_PATH);
    }
  }, [
    loading,
    initError,
    isAuthenticated,
    isAdmin,
    isPublic,
    requiresAdmin,
    isUnauthorizedPage,
    pathname,
    router,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading session…</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Session error</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{initError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button type="button" onClick={retryInit}>
              Retry
            </Button>
            <Button type="button" variant="secondary" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublic) return null;
  if (isAuthenticated && requiresAdmin && !isAdmin && !isUnauthorizedPage) return null;

  return <>{children}</>;
}

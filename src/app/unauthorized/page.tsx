"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
export default function UnauthorizedPage() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <div className="text-4xl">403</div>
      <h1 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Access denied</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {profile
          ? `Your account (${profile.email ?? profile.fullName}) does not have permission to view this page.`
          : "You do not have permission to view this page."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/issues"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Go to Issues
        </Link>
      </div>
    </div>
  );
}

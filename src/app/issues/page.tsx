"use client";

import { Suspense } from "react";
import IssuesPageClient from "./IssuesPageClient";

export default function IssuesPageRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
          Loading issues…
        </div>
      }
    >
      <IssuesPageClient />
    </Suspense>
  );
}

"use client";

import type { IssueKpis } from "@/types/issue";

type IssueKpiCardsProps = {
  kpis: IssueKpis;
  loading: boolean;
};

const cards = [
  { key: "total" as const, label: "Total issues", accent: "border-l-blue-500" },
  { key: "critical" as const, label: "Critical issues", accent: "border-l-red-500" },
];

export function IssueKpiCards({ kpis, loading }: IssueKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          key={card.key}
          className={[
            "rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900",
            "border-l-4",
            card.accent,
          ].join(" ")}
        >
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {card.label}
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {loading ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            ) : (
              kpis[card.key].toLocaleString()
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

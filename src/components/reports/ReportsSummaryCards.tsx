"use client";

import type { ReportMetrics } from "@/types/reports";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

type Props = {
  metrics: ReportMetrics;
  loading: boolean;
};

export function ReportsSummaryCards({ metrics, loading }: Props) {
  const cards = [
    { label: "Total issues", value: metrics.totalIssues },
    { label: "Issue types", value: metrics.byIssueType.length },
    { label: "Replacements flagged", value: metrics.topReplacements.reduce((s, r) => s + r.count, 0) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className={`${dashboardPanel} px-4 py-3`}>
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {card.label}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {loading ? "…" : card.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import type { ReportBreakdownItem, ReportMetrics } from "@/types/reports";
import { breakdownMax } from "@/lib/reports/reports-metrics";
import { dashboardPanel } from "@/components/issues/dashboard-ui";

type Props = {
  metrics: ReportMetrics;
  loading: boolean;
};

export function ReportsCharts({ metrics, loading }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Issues by type" loading={loading}>
        <BreakdownBars items={metrics.byIssueType} />
      </ChartCard>
      <ChartCard title="Issues by source" loading={loading}>
        <BreakdownBars items={metrics.bySource} />
      </ChartCard>
      <ChartCard title="By motherboard type" loading={loading}>
        <BreakdownBars items={metrics.byMotherboardType} />
      </ChartCard>
      <ChartCard title="By PMM type" loading={loading}>
        <BreakdownBars items={metrics.byPmmType} />
      </ChartCard>
      <ChartCard title="By SSD type" loading={loading}>
        <BreakdownBars items={metrics.bySsdType} />
      </ChartCard>
      <ChartCard title="Most common failures" loading={loading}>
        <BreakdownBars items={metrics.topFailures} />
      </ChartCard>
      <ChartCard title="Most common replacements" loading={loading}>
        <BreakdownBars items={metrics.topReplacements} />
      </ChartCard>
      <ChartCard title="Monthly issue trends" loading={loading}>
        <TrendBars items={metrics.monthlyTrends} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${dashboardPanel} p-4`}>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{title}</h3>
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">Loading…</div>
      ) : (
        children
      )}
    </div>
  );
}

function BreakdownBars({ items }: { items: ReportBreakdownItem[] }) {
  if (items.length === 0) {
    return <EmptyChart />;
  }
  const max = breakdownMax(items);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-zinc-700 dark:text-zinc-300" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{item.count}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TrendBars({ items }: { items: ReportBreakdownItem[] }) {
  if (items.length === 0) {
    return <EmptyChart />;
  }
  const max = breakdownMax(items);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t bg-emerald-600 dark:bg-emerald-500"
            style={{ height: `${Math.max(8, (item.count / max) * 128)}px` }}
            title={`${item.label}: ${item.count}`}
          />
          <span className="max-w-full truncate text-[10px] text-zinc-500 dark:text-zinc-400" title={item.label}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return <div className="flex h-24 items-center justify-center text-sm text-zinc-400">No data for current filters</div>;
}

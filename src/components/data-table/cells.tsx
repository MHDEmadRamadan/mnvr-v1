"use client";

import type { ReactNode } from "react";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function EmptyCell() {
  return (
    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-400 dark:bg-zinc-800/80 dark:text-zinc-500">
      —
    </span>
  );
}

export function CellWrap({ children }: { children: ReactNode }) {
  if (children === "—" || children === null || children === undefined) {
    return <EmptyCell />;
  }
  return <span className="block truncate">{children}</span>;
}

export function formatDisplayDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sanitizeText(value: string | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  const t = value.trim();
  if (UUID_PATTERN.test(t)) return "—";
  return t;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

type Tone = "ok" | "warn" | "bad" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  warn: "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  bad: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
  neutral: "bg-zinc-500/10 text-zinc-700 ring-1 ring-zinc-500/15 dark:bg-zinc-500/15 dark:text-zinc-300 dark:ring-zinc-500/25",
};

function statusTone(value: string): Tone {
  const v = value.toLowerCase();
  if (/ok|online|active|up|good|healthy|connected|yes/.test(v)) return "ok";
  if (/warn|degraded|partial|idle|pending/.test(v)) return "warn";
  if (/fail|error|down|offline|critical|bad|no|disconnected/.test(v)) return "bad";
  return "neutral";
}

function issueTypeTone(value: string): Tone {
  const v = value.toLowerCase();
  if (/resolved|closed|fixed/.test(v)) return "ok";
  if (/critical|urgent|fail/.test(v)) return "bad";
  if (/warn|pending|open/.test(v)) return "warn";
  return "neutral";
}

export function StatusPill({ value, variant = "status" }: { value: string; variant?: "status" | "issue" }) {
  const tone = variant === "issue" ? issueTypeTone(value) : statusTone(value);
  return (
    <span className={`inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>
      {value}
    </span>
  );
}

export function BoolPill({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
      <span aria-hidden>✓</span> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-500/15 dark:text-zinc-400">
      <span aria-hidden>✗</span> No
    </span>
  );
}

export function RowIndexCell({ n }: { n: number }) {
  return (
    <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-zinc-100 font-mono text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      {n}
    </span>
  );
}

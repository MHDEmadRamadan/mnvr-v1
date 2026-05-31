import type { ReactNode } from "react";

const variants = {
  default: "bg-zinc-500/10 text-zinc-700 ring-zinc-500/15 dark:text-zinc-300",
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  warning: "bg-amber-500/10 text-amber-800 ring-amber-500/20 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300",
  outline: "bg-transparent text-zinc-600 ring-zinc-300 dark:text-zinc-400 dark:ring-zinc-600",
} as const;

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variants[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

"use client";

import { Checkbox } from "@/components/ui/checkbox";

export function BoolField({
  label,
  checked,
  onChange,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40",
        className ?? "",
      ].join(" ")}
    >
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm text-zinc-800 dark:text-zinc-200">{label}</span>
    </label>
  );
}

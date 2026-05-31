"use client";

/**
 * Toasts — small success/error messages shown in the top-right corner.
 */

export type Toast = {
  id: string;
  type: "success" | "error";
  message: string;
};

type ToastsProps = {
  toasts: Toast[];
};

export function Toasts({ toasts }: ToastsProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            "pointer-events-auto w-[320px] rounded-lg border p-3 text-sm shadow-lg backdrop-blur",
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}


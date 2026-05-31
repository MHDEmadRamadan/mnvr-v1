import { forwardRef, type InputHTMLAttributes } from "react";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={[
        "h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900",
        "focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-0",
        "dark:border-zinc-600 dark:bg-zinc-950 dark:checked:bg-zinc-100 dark:checked:text-zinc-900",
        className,
      ].join(" ")}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";

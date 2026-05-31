import { forwardRef, type ButtonHTMLAttributes } from "react";

const base =
  "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent dark:focus-visible:ring-blue-400/50";

const variants = {
  secondary: [
    base,
    "border border-zinc-200/90 bg-white text-zinc-700",
    "hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900",
    "dark:border-zinc-600/80 dark:bg-zinc-900 dark:text-zinc-300",
    "dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
  ].join(" "),
  destructive: [
    base,
    "border border-red-200/90 bg-red-50 text-red-700",
    "hover:border-red-300 hover:bg-red-100 hover:text-red-800",
    "dark:border-red-900/60 dark:bg-red-950/70 dark:text-red-300",
    "dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-200",
  ].join(" "),
} as const;

export type TableActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export const TableActionButton = forwardRef<HTMLButtonElement, TableActionButtonProps>(
  ({ className = "", variant = "secondary", type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={[variants[variant], className].join(" ")} {...props} />
  ),
);
TableActionButton.displayName = "TableActionButton";

type TableRowActionsProps = {
  children: React.ReactNode;
  className?: string;
};

/** Flex container for sticky Actions column — nowrap, centered, consistent gap. */
export function TableRowActions({ children, className = "" }: TableRowActionsProps) {
  return (
    <div
      className={[
        "flex flex-nowrap items-center justify-end gap-1.5",
        className,
      ].join(" ")}
      role="group"
      aria-label="Row actions"
    >
      {children}
    </div>
  );
}

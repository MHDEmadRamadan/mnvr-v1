import { dashboardInput } from "@/components/issues/dashboard-ui";

export function FieldShell({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={["block", className ?? ""].join(" ")}>
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
        {label}
        {required ? <span className="text-red-600 dark:text-red-400"> *</span> : null}
      </span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span> : null}
    </label>
  );
}

export function inputClass(hasError?: string) {
  return [dashboardInput, hasError ? "border-red-400 dark:border-red-800" : ""].join(" ");
}

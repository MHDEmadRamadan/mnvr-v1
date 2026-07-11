import { dashboardInput } from "@/components/issues/dashboard-ui";

export type FieldShellVariant = "dashboard" | "auth";

const authInput =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";

function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 h-3.5 w-3.5 shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-4a1 1 0 00-1 1v4a1 1 0 102 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function FieldShell({
  label,
  error,
  hint,
  required,
  children,
  className,
  hideLabel = false,
  fieldKey,
  controlId,
  variant = "dashboard",
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  hideLabel?: boolean;
  /** Used for scroll-to-error targeting via `[data-field-key]`. */
  fieldKey?: string;
  /** Associates the label with the control (`htmlFor`). */
  controlId?: string;
  variant?: FieldShellVariant;
}) {
  const errorId = controlId && error ? `${controlId}-error` : undefined;
  const hasError = Boolean(error);

  return (
    <div className={["block", className ?? ""].join(" ")} data-field-key={fieldKey}>
      {hideLabel ? null : (
        <label
          htmlFor={controlId}
          className={[
            "mb-1 flex items-center gap-1 text-xs font-medium",
            hasError ? "text-red-600 dark:text-red-400" : variant === "auth"
              ? "text-gray-700 dark:text-gray-300"
              : "text-zinc-600 dark:text-zinc-300",
          ].join(" ")}
        >
          <span>{label}</span>
          {required ? (
            <span className="text-red-600 dark:text-red-400" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
      )}
      {children}
      {hint && !error ? (
        <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 flex items-start gap-1 text-xs text-red-600 dark:text-red-400"
        >
          <ErrorIcon />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export function inputClass(hasError?: string, variant: FieldShellVariant = "dashboard") {
  const base = variant === "auth" ? authInput : dashboardInput;
  return [
    base,
    hasError ? "border-red-500 ring-1 ring-red-500/30 dark:border-red-600 dark:ring-red-900/40" : "",
  ].join(" ");
}

import { sanitizeText } from "@/components/data-table/cells";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

type DeviceTicketsDisplayProps = {
  value: string | null | undefined;
  className?: string;
};

/** Renders device.tickets as a link (http/https) or plain text. */
export function DeviceTicketsDisplay({ value, className }: DeviceTicketsDisplayProps) {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return <span className={["text-zinc-400", className ?? ""].join(" ")}>—</span>;
  }

  if (isHttpUrl(raw)) {
    return (
      <a
        href={raw}
        target="_blank"
        rel="noopener noreferrer"
        className={[
          "text-blue-600 underline decoration-blue-600/30 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300",
          className ?? "",
        ].join(" ")}
      >
        {raw}
      </a>
    );
  }

  return <span className={["break-words", className ?? ""].join(" ")}>{sanitizeText(raw)}</span>;
}

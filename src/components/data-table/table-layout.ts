/**
 * Unified row/cell surface tokens — every cell in a row shares identical background +
 * group-hover classes so sticky columns never diverge from data cells.
 *
 * Root cause fix: `<tr hover:bg-*>` + separate sticky `group-hover` on `<td>` created
 * dual stacking contexts with mismatched semi-transparent colors → bleed & flicker.
 */

export const ACTIONS_COLUMN_WIDTH = "min-w-[15.5rem] w-[15.5rem] max-w-[15.5rem]";

export const STICKY_ACTIONS_BASE =
  "sticky right-0 border-l border-zinc-200/90 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.07)] dark:border-zinc-700/90 dark:shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.5)]";

export const STICKY_SELECT_BASE =
  "sticky left-0 z-10 border-r border-zinc-200/80 dark:border-zinc-800/80";

export const STICKY_ACTIONS_HEADER = [
  STICKY_ACTIONS_BASE,
  "z-40 bg-zinc-50 dark:bg-zinc-950",
].join(" ");

export const STICKY_SELECT_HEADER = [
  STICKY_SELECT_BASE,
  "z-30 bg-zinc-50 dark:bg-zinc-950",
].join(" ");

export type RowVariant = "even" | "odd" | "selected";

export function getRowVariant(zebra: boolean, selected: boolean): RowVariant {
  if (selected) return "selected";
  return zebra ? "even" : "odd";
}

/** Opaque surface — identical on every cell including sticky. */
const SURFACE: Record<RowVariant, string> = {
  even: [
    "bg-white dark:bg-zinc-900",
    "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800",
  ].join(" "),
  odd: [
    "bg-zinc-50 dark:bg-zinc-950",
    "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800",
  ].join(" "),
  selected: [
    "bg-blue-50 dark:bg-blue-950/60",
    "group-hover:bg-blue-100 dark:group-hover:bg-blue-950/80",
  ].join(" "),
};

export const ROW_GROUP = "group";

export function rowClass(): string {
  return ROW_GROUP;
}

export function cellSurface(variant: RowVariant): string {
  return SURFACE[variant];
}

export function dataCellClass(variant: RowVariant, extra = ""): string {
  return [
    cellSurface(variant),
    "whitespace-nowrap border-b border-zinc-100 px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-800/60 dark:text-zinc-100",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function stickySelectCellClass(variant: RowVariant): string {
  return [STICKY_SELECT_BASE, cellSurface(variant), "z-10 px-2 py-2.5"].join(" ");
}

export function stickyActionsCellClass(variant: RowVariant): string {
  return [STICKY_ACTIONS_BASE, cellSurface(variant), "z-20 px-2 py-2 align-middle"].join(" ");
}

export const TABLE_SCROLL_REGION =
  "relative isolate min-h-0 max-h-[70vh] w-full flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]";

export const TABLE_ELEMENT = "w-full min-w-max border-separate border-spacing-0 table-auto";

export const HEADER_STICKY = "sticky z-30 bg-zinc-50 dark:bg-zinc-950";

export const ACTIONS_INNER =
  "flex flex-nowrap items-center justify-end gap-1.5";

/** replacements.ssd — PostgreSQL "SSD" enum (production values: NEW / USED / No) */
export type ReplacementSsd = "NEW" | "USED" | "No";

/** replacements.motherboard — PostgreSQL "MOTHERBOARD" enum */
export type ReplacementMotherboard = "NEW" | "USED" | "No";

/** replacements.sata_cable — PostgreSQL sata_cable enum */
export type ReplacementSataCable = "NEW" | "USED" | "No";

export const REPLACEMENT_SSD_OPTIONS: readonly ReplacementSsd[] = ["NEW", "USED", "No"] as const;
export const REPLACEMENT_MOTHERBOARD_OPTIONS: readonly ReplacementMotherboard[] = ["NEW", "USED", "No"] as const;
export const REPLACEMENT_SATA_CABLE_OPTIONS: readonly ReplacementSataCable[] = ["NEW", "USED", "No"] as const;

export const DEFAULT_REPLACEMENT_SSD: ReplacementSsd = "No";
export const DEFAULT_REPLACEMENT_MOTHERBOARD: ReplacementMotherboard = "No";
export const DEFAULT_REPLACEMENT_SATA_CABLE: ReplacementSataCable = "No";

export function isReplacementActive(value: ReplacementSsd | ReplacementMotherboard | ReplacementSataCable | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "No";
}

/**
 * Shared Issues query layer — enriched select constants.
 * Filtering / sorting / pagination run in Postgres via `page_filtered_issues`
 * (see `src/lib/issues/filter-rpc.ts`).
 */

const DEVICE_STATUS_FIELDS = `
  id,
  software_version,
  flespi_status,
  screen_status,
  dotmatrix_status,
  ssh_status,
  pmm_software,
  description,
  created_at
`;

const HARDWARE_FIELDS = `
  id,
  motherboard_type,
  pmm_type,
  description,
  created_at
`;

const STORAGE_FIELDS = `
  id,
  ssd_type,
  disk_health,
  power_on_hours,
  power_cycles,
  power_off,
  lifetime,
  summary_ssd,
  description,
  created_at
`;

const REPLACEMENTS_FIELDS = `
  id,
  ssd,
  motherboard,
  sata_cable,
  imei_changed,
  sim_changed,
  device_changed,
  description,
  created_at
`;

/** Static enriched select for list / export / CRUD returns (joins are left). */
export const ISSUES_ENRICHED_SELECT = `
  *,
  created_by_profile:created_by ( full_name, email ),
  resolved_by_profile:resolved_by ( full_name, email ),
  device:device_id (
    id,
    imei,
    description,
    tickets,
    vehicle:vehicle_id (
      id,
      vehicle_number,
      description
    ),
    device_status (
      ${DEVICE_STATUS_FIELDS}
    ),
    hardware (
      ${HARDWARE_FIELDS}
    ),
    storage (
      ${STORAGE_FIELDS}
    ),
    replacements (
      ${REPLACEMENTS_FIELDS}
    )
  )
`;

export const ISSUES_FETCH_CHUNK = 1000;
export const ISSUES_MAX_EXPORT_ROWS = 50_000;

/**
 * Fields covered by Postgres global search (page_filtered_issues).
 * Kept for tests / documentation — search is executed in SQL, not PostgREST `.or()`.
 */
export const GLOBAL_SEARCH_FIELDS = [
  "issue_type",
  "motherboard_issue",
  "pmm_issue",
  "ssd_issue",
  "other_issue",
  "description",
  "device.imei",
  "device.tickets",
  "device.description",
  "vehicle.vehicle_number",
  "vehicle.description",
  "device_status.software_version",
  "device_status.flespi_status",
  "device_status.screen_status",
  "device_status.dotmatrix_status",
  "device_status.pmm_software",
  "hardware.motherboard_type",
  "hardware.pmm_type",
  "storage.ssd_type",
] as const;

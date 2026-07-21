import type { IssueQueryFilters, TextFilterValue } from "@/types/issue";
import type { IssueFilterFieldId } from "@/config/issue-filter-catalog";
import {
  getIssueFilterField,
  ISSUE_FILTER_FIELDS,
  MULTI_VALUE_FILTER_KEYS,
} from "@/config/issue-filter-catalog";
import type {
  ReplacementMotherboard,
  ReplacementSataCable,
  ReplacementSsd,
} from "@/types/replacements";
import { normalizeTextFilterValues } from "@/lib/issues/filter-rpc";

export type IssuesFilterState = {
  globalSearch: string;
  dateMode: "all" | "current_month" | "range";
  fromDate: string;
  toDate: string;
  status: "" | "open" | "resolved";
  vehicleNumber: string[];
  deviceImei: string[];
  issueType: string[];
  vehicleDescription: string[];
  deviceTickets: string[];
  deviceDescription: string[];
  softwareVersion: string[];
  pmmSoftware: string[];
  motherboardType: string[];
  pmmType: string[];
  ssdType: string[];
  motherboardIssue: string[];
  pmmIssue: string[];
  ssdIssue: string[];
  otherIssue: string[];
  description: string[];
  deviceChanged: "" | "true" | "false";
  ssd: "" | ReplacementSsd;
  motherboard: "" | ReplacementMotherboard;
  sataCable: "" | ReplacementSataCable;
  imeiChanged: string;
  simChanged: string;
  createdBy: string;
  editedBy: string;
  flespiStatus: string[];
  screenStatus: string[];
  dotmatrixStatus: string[];
  sshStatus: "" | "true" | "false";
  diskHealth: "" | "true" | "false";
  powerOnHoursMin: string;
  powerOnHoursMax: string;
  powerCyclesMin: string;
  powerCyclesMax: string;
  powerOffCountMin: string;
  powerOffCountMax: string;
  lifetimeMin: string;
  lifetimeMax: string;
  summarySsd: string[];
  storageDescription: string[];
  hardwareDescription: string[];
  replacementsDescription: string[];
  deviceStatusDescription: string[];
};

export type ActiveFilterChip = {
  id: string;
  fieldId: IssueFilterFieldId;
  label: string;
  value: string;
  /** For multi-select: which exact value to remove. */
  multiValue?: string;
};

function monthRange(reference = new Date()) {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function isoToDateInput(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseOptionalNumber(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(raw: "" | "true" | "false"): boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function emptyMulti(): string[] {
  return [];
}

export function defaultFilterState(): IssuesFilterState {
  const month = monthRange();
  return {
    globalSearch: "",
    dateMode: "all",
    fromDate: isoToDateInput(month.from.toISOString()),
    toDate: isoToDateInput(month.to.toISOString()),
    status: "",
    vehicleNumber: emptyMulti(),
    deviceImei: emptyMulti(),
    issueType: emptyMulti(),
    vehicleDescription: emptyMulti(),
    deviceTickets: emptyMulti(),
    deviceDescription: emptyMulti(),
    softwareVersion: emptyMulti(),
    pmmSoftware: emptyMulti(),
    motherboardType: emptyMulti(),
    pmmType: emptyMulti(),
    ssdType: emptyMulti(),
    motherboardIssue: emptyMulti(),
    pmmIssue: emptyMulti(),
    ssdIssue: emptyMulti(),
    otherIssue: emptyMulti(),
    description: emptyMulti(),
    deviceChanged: "",
    ssd: "",
    motherboard: "",
    sataCable: "",
    imeiChanged: "",
    simChanged: "",
    createdBy: "",
    editedBy: "",
    flespiStatus: emptyMulti(),
    screenStatus: emptyMulti(),
    dotmatrixStatus: emptyMulti(),
    sshStatus: "",
    diskHealth: "",
    powerOnHoursMin: "",
    powerOnHoursMax: "",
    powerCyclesMin: "",
    powerCyclesMax: "",
    powerOffCountMin: "",
    powerOffCountMax: "",
    lifetimeMin: "",
    lifetimeMax: "",
    summarySsd: emptyMulti(),
    storageDescription: emptyMulti(),
    hardwareDescription: emptyMulti(),
    replacementsDescription: emptyMulti(),
    deviceStatusDescription: emptyMulti(),
  };
}

function toQueryMulti(values: string[]): TextFilterValue | undefined {
  const cleaned = normalizeTextFilterValues(values);
  if (cleaned.length === 0) return undefined;
  return cleaned.length === 1 ? cleaned[0] : cleaned;
}

export function toIssueQueryFilters(state: IssuesFilterState): IssueQueryFilters {
  const filters: IssueQueryFilters = {};

  if (state.globalSearch.trim()) filters.globalSearch = state.globalSearch.trim();
  if (state.status === "open" || state.status === "resolved") filters.status = state.status;

  filters.vehicleNumber = toQueryMulti(state.vehicleNumber);
  filters.deviceImei = toQueryMulti(state.deviceImei);
  filters.issueType = toQueryMulti(state.issueType);
  filters.vehicleDescription = toQueryMulti(state.vehicleDescription);
  filters.deviceTickets = toQueryMulti(state.deviceTickets);
  filters.deviceDescription = toQueryMulti(state.deviceDescription);
  filters.softwareVersion = toQueryMulti(state.softwareVersion);
  filters.pmmSoftware = toQueryMulti(state.pmmSoftware);
  filters.motherboardType = toQueryMulti(state.motherboardType);
  filters.pmmType = toQueryMulti(state.pmmType);
  filters.ssdType = toQueryMulti(state.ssdType);
  filters.motherboardIssue = toQueryMulti(state.motherboardIssue);
  filters.pmmIssue = toQueryMulti(state.pmmIssue);
  filters.ssdIssue = toQueryMulti(state.ssdIssue);
  filters.otherIssue = toQueryMulti(state.otherIssue);
  filters.description = toQueryMulti(state.description);
  filters.flespiStatus = toQueryMulti(state.flespiStatus);
  filters.screenStatus = toQueryMulti(state.screenStatus);
  filters.dotmatrixStatus = toQueryMulti(state.dotmatrixStatus);
  filters.summarySsd = toQueryMulti(state.summarySsd);
  filters.storageDescription = toQueryMulti(state.storageDescription);
  filters.hardwareDescription = toQueryMulti(state.hardwareDescription);
  filters.replacementsDescription = toQueryMulti(state.replacementsDescription);
  filters.deviceStatusDescription = toQueryMulti(state.deviceStatusDescription);

  if (state.ssd) filters.ssd = state.ssd;
  if (state.motherboard) filters.motherboard = state.motherboard;
  if (state.sataCable) filters.sataCable = state.sataCable;
  if (state.imeiChanged.trim()) filters.imeiChanged = state.imeiChanged.trim();
  if (state.simChanged.trim()) filters.simChanged = state.simChanged.trim();
  if (state.createdBy.trim()) filters.createdBy = state.createdBy.trim();
  if (state.editedBy.trim()) filters.editedBy = state.editedBy.trim();

  const deviceChanged = parseBool(state.deviceChanged);
  if (deviceChanged !== undefined) filters.deviceChanged = deviceChanged;
  const ssh = parseBool(state.sshStatus);
  if (ssh !== undefined) filters.sshStatus = ssh;
  const disk = parseBool(state.diskHealth);
  if (disk !== undefined) filters.diskHealth = disk;

  const setRange = (
    minKey: keyof IssueQueryFilters,
    maxKey: keyof IssueQueryFilters,
    minRaw: string,
    maxRaw: string,
  ) => {
    const min = parseOptionalNumber(minRaw);
    const max = parseOptionalNumber(maxRaw);
    if (min !== undefined) (filters as Record<string, number>)[minKey as string] = min;
    if (max !== undefined) (filters as Record<string, number>)[maxKey as string] = max;
  };
  setRange("powerOnHoursMin", "powerOnHoursMax", state.powerOnHoursMin, state.powerOnHoursMax);
  setRange("powerCyclesMin", "powerCyclesMax", state.powerCyclesMin, state.powerCyclesMax);
  setRange("powerOffCountMin", "powerOffCountMax", state.powerOffCountMin, state.powerOffCountMax);
  setRange("lifetimeMin", "lifetimeMax", state.lifetimeMin, state.lifetimeMax);

  if (state.dateMode === "current_month") {
    const { from, to } = monthRange();
    filters.createdFrom = from.toISOString();
    filters.createdTo = to.toISOString();
  } else if (state.dateMode === "range") {
    if (state.fromDate) {
      filters.createdFrom = new Date(`${state.fromDate}T00:00:00.000Z`).toISOString();
    }
    if (state.toDate) {
      filters.createdTo = new Date(`${state.toDate}T23:59:59.999Z`).toISOString();
    }
  }

  return filters;
}

function isMultiKey(key: string): boolean {
  return (MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(key);
}

function isFieldActive(state: IssuesFilterState, fieldId: IssueFilterFieldId): boolean {
  const field = getIssueFilterField(fieldId);
  if (!field) return false;

  if (fieldId === "date") return state.dateMode !== "all";
  if (fieldId === "globalSearch") return Boolean(state.globalSearch.trim());

  if (field.control === "numericRange") {
    const [minKey, maxKey] = field.stateKeys;
    return Boolean(
      String(state[minKey as keyof IssuesFilterState] ?? "").trim() ||
        String(state[maxKey as keyof IssuesFilterState] ?? "").trim(),
    );
  }

  const key = field.stateKeys[0] as keyof IssuesFilterState;
  const value = state[key];
  if (Array.isArray(value)) return value.some((v) => String(v).trim().length > 0);
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export function getActiveFilterChips(state: IssuesFilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const field of ISSUE_FILTER_FIELDS) {
    if (!isFieldActive(state, field.id)) continue;
    if (field.id === "globalSearch") continue;

    if (field.control === "multiAutocomplete" || isMultiKey(field.stateKeys[0])) {
      const values = state[field.stateKeys[0] as keyof IssuesFilterState] as string[];
      for (const value of values) {
        if (!value.trim()) continue;
        chips.push({
          id: `${field.id}:${value}`,
          fieldId: field.id,
          label: field.label,
          value,
          multiValue: value,
        });
      }
      continue;
    }

    chips.push({
      id: field.id,
      fieldId: field.id,
      label: field.label,
      value: formatFilterChipValue(state, field.id),
    });
  }

  if (state.globalSearch.trim()) {
    chips.unshift({
      id: "globalSearch",
      fieldId: "globalSearch",
      label: "Search",
      value: state.globalSearch.trim(),
    });
  }

  return chips;
}

export function countActiveFilters(state: IssuesFilterState): number {
  return getActiveFilterChips(state).length;
}

export function clearFilterField(state: IssuesFilterState, fieldId: IssueFilterFieldId): IssuesFilterState {
  const field = getIssueFilterField(fieldId);
  if (!field) return state;
  const next = { ...state };
  const defaults = defaultFilterState();

  for (const key of field.stateKeys) {
    const def = defaults[key as keyof IssuesFilterState];
    (next as Record<string, unknown>)[key] = Array.isArray(def) ? [] : (def ?? "");
  }
  if (fieldId === "date") next.dateMode = "all";
  return next;
}

export function removeFilterChip(state: IssuesFilterState, chip: ActiveFilterChip): IssuesFilterState {
  if (chip.multiValue != null) {
    const field = getIssueFilterField(chip.fieldId);
    if (!field) return state;
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    const current = state[key];
    if (!Array.isArray(current)) return clearFilterField(state, chip.fieldId);
    return {
      ...state,
      [key]: current.filter((v) => v !== chip.multiValue),
    };
  }
  return clearFilterField(state, chip.fieldId);
}

export function formatFilterChipValue(state: IssuesFilterState, fieldId: IssueFilterFieldId): string {
  const field = getIssueFilterField(fieldId);
  if (!field) return "";

  if (fieldId === "date") {
    if (state.dateMode === "current_month") return "Current month";
    if (state.dateMode === "range") {
      return [state.fromDate, state.toDate].filter(Boolean).join(" → ") || "Custom range";
    }
    return "All time";
  }

  if (field.control === "boolean") {
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    const v = state[key];
    if (v === "true") return "Yes";
    if (v === "false") return "No";
    return String(v);
  }

  if (field.control === "triStateText") {
    const key = field.stateKeys[0] as keyof IssuesFilterState;
    const v = String(state[key] ?? "").trim();
    if (v === "true") return "Has change";
    if (v === "false" || v.toLowerCase() === "no" || v.toLowerCase() === "no change") return "No change";
    return v;
  }

  if (field.control === "status") {
    if (state.status === "open") return "Open";
    if (state.status === "resolved") return "Resolved";
    return state.status;
  }

  if (field.control === "numericRange") {
    const min = String(state[field.stateKeys[0] as keyof IssuesFilterState] ?? "").trim();
    const max = String(state[field.stateKeys[1] as keyof IssuesFilterState] ?? "").trim();
    if (min && max) return `${min} – ${max}`;
    if (min) return `≥ ${min}`;
    if (max) return `≤ ${max}`;
    return "";
  }

  const key = field.stateKeys[0] as keyof IssuesFilterState;
  const value = state[key];
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "").trim();
}

export function describeFilterState(state: IssuesFilterState): string[] {
  return getActiveFilterChips(state).map((chip) => `${chip.label}: ${chip.value}`);
}

function parseLegacyOrMulti(raw: string | null, all: string[]): string[] {
  if (all.length > 0) return [...new Set(all.map((v) => v.trim()).filter(Boolean))];
  if (raw == null || raw.trim() === "") return [];
  // Legacy: single string, or JSON array
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return [raw.trim()].filter(Boolean);
}

/** Compact URL serialization — only non-default values. */
export function serializeFiltersToParams(state: IssuesFilterState): URLSearchParams {
  const params = new URLSearchParams();
  const defaults = defaultFilterState();
  const omitDateDefaults = new Set(["fromDate", "toDate"]);

  for (const [key, value] of Object.entries(state) as [keyof IssuesFilterState, IssuesFilterState[keyof IssuesFilterState]][]) {
    if (omitDateDefaults.has(key as string) && state.dateMode !== "range") continue;
    const def = defaults[key];

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      for (const item of value) {
        if (item.trim()) params.append(String(key), item);
      }
      continue;
    }

    if (value === def) continue;
    if (typeof value === "string" && value.trim() === "" && def === "") continue;
    params.set(String(key), String(value));
  }
  return params;
}

/**
 * Preserve unrelated URL parameters while replacing the complete filter state.
 * Multi-select keys must use append(), otherwise URLSearchParams.set() collapses
 * repeated values to the last selection.
 */
export function mergeFiltersIntoParams(
  currentParams: URLSearchParams,
  state: IssuesFilterState,
): URLSearchParams {
  const merged = new URLSearchParams(currentParams);
  for (const key of Object.keys(defaultFilterState())) {
    merged.delete(key);
  }
  for (const [key, value] of serializeFiltersToParams(state).entries()) {
    merged.append(key, value);
  }
  return merged;
}

export function parseFiltersFromParams(params: URLSearchParams): IssuesFilterState {
  const state = defaultFilterState();

  for (const key of Object.keys(state) as (keyof IssuesFilterState)[]) {
    if (isMultiKey(String(key))) {
      (state as unknown as Record<string, string[]>)[String(key)] = parseLegacyOrMulti(
        params.get(String(key)),
        params.getAll(String(key)),
      );
      continue;
    }
    const raw = params.get(String(key));
    if (raw === null) continue;
    (state as unknown as Record<string, string>)[String(key)] = raw;
  }

  if (state.dateMode !== "all" && state.dateMode !== "current_month" && state.dateMode !== "range") {
    state.dateMode = "all";
  }
  if (state.status !== "" && state.status !== "open" && state.status !== "resolved") {
    state.status = "";
  }
  return state;
}

export function filtersEqual(a: IssuesFilterState, b: IssuesFilterState): boolean {
  return serializeFiltersToParams(a).toString() === serializeFiltersToParams(b).toString();
}

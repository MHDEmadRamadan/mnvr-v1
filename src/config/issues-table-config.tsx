import type { Issue } from "@/types/issue";
import type { DataTableColumnGroup } from "@/components/data-table/types";
import { coerceDbBoolean } from "@/lib/coerce-db-boolean";
import { formatReplacementDbValueForDisplay } from "@/lib/replacements-value-mapper";
import {
  BoolPill,
  CellWrap,
  formatCount,
  formatDisplayDate,
  RowIndexCell,
  sanitizeText,
  StatusPill,
} from "@/components/data-table/cells";
import { DeviceTicketsDisplay } from "@/components/issues/DeviceTicketsDisplay";

const text = (v: string | null | undefined) => <CellWrap>{sanitizeText(v)}</CellWrap>;
const status = (v: string | null | undefined) => {
  const t = sanitizeText(v);
  return t === "—" ? <CellWrap>—</CellWrap> : <StatusPill value={t} />;
};
const issueType = (v: string) => {
  const t = sanitizeText(v);
  return t === "—" ? <CellWrap>—</CellWrap> : <StatusPill value={t} variant="issue" />;
};
const bool = (v: boolean | null | undefined) =>
  v === null || v === undefined ? (
    <CellWrap>—</CellWrap>
  ) : (
    <BoolPill value={coerceDbBoolean(v)} />
  );

const replacementDbValue = (v: boolean | string | number | null | undefined) => (
  <CellWrap>{formatReplacementDbValueForDisplay(v)}</CellWrap>
);

export const ISSUES_TABLE_GROUPS: DataTableColumnGroup<Issue>[] = [
  {
    id: "identity",
    label: "Device",
    columns: [
      {
        id: "_rowNum",
        label: "#",
        className: "min-w-[3.5rem] w-14",
        sortable: false,
        hideable: false,
        render: (_, ctx) => <RowIndexCell n={ctx.rowIndex} />,
      },
      {
        id: "vehicleNumber",
        label: "Vehicle",
        className: "min-w-[7.5rem] w-[120px]",
        hideable: false,
        sortValue: (r) => r.vehicleNumber ?? "",
        render: (r) => text(r.vehicleNumber),
      },
      {
        id: "deviceImei",
        label: "IMEI",
        className: "w-[140px]",
        hideable: false,
        sortValue: (r) => r.deviceImei ?? "",
        render: (r) => (
          <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">
            {sanitizeText(r.deviceImei)}
          </span>
        ),
      },
      {
        id: "deviceTickets",
        label: "Tickets",
        className: "min-w-[8rem] w-[140px]",
        sortValue: (r) => r.deviceTickets ?? "",
        render: (r) => (
          <CellWrap>
            <DeviceTicketsDisplay value={r.deviceTickets} className="text-xs" />
          </CellWrap>
        ),
      },
    ],
  },
  {
    id: "deviceStatus",
    label: "Status",
    columns: [
      {
        id: "softwareVersion",
        label: "software_version",
        className: "min-w-[7.5rem] w-[120px]",
        sortValue: (r) => r.softwareVersion ?? "",
        render: (r) => text(r.softwareVersion),
      },
      {
        id: "flespiStatus",
        label: "flespi_status",
        className: "w-[100px]",
        sortValue: (r) => r.flespiStatus ?? "",
        render: (r) => status(r.flespiStatus),
      },
      {
        id: "screenStatus",
        label: "screen_status",
        className: "w-[100px]",
        sortValue: (r) => r.screenStatus ?? "",
        render: (r) => status(r.screenStatus),
      },
      {
        id: "dotMatrixStatus",
        label: "dotmatrix_status",
        className: "w-[110px]",
        sortValue: (r) => r.dotMatrixStatus ?? "",
        render: (r) => status(r.dotMatrixStatus),
      },
      {
        id: "sshStatus",
        label: "ssh_status",
        className: "w-[88px]",
        sortValue: (r) => r.sshStatus ?? null,
        render: (r) => bool(r.sshStatus),
      },
      {
        id: "pmmSoftware",
        label: "pmm_software",
        className: "w-[90px]",
        sortable: false,
        render: (r) => <CellWrap>{formatCount(r.pmmSoftware)}</CellWrap>,
      },
    ],
  },
  {
    id: "issues",
    label: "Issue",
    columns: [
      {
        id: "issueType",
        label: "Type",
        className: "w-[110px]",
        sortValue: (r) => r.issueType,
        render: (r) => issueType(r.issueType),
      },
      {
        id: "motherboardIssue",
        label: "Motherboard",
        className: "min-w-[7.5rem] w-[120px]",
        sortValue: (r) => r.motherboardIssue,
        render: (r) => text(r.motherboardIssue),
      },
      {
        id: "pmmIssue",
        label: "PMM",
        className: "w-[100px]",
        sortValue: (r) => r.pmmIssue,
        render: (r) => text(r.pmmIssue),
      },
      {
        id: "ssdIssue",
        label: "SSD",
        className: "w-[100px]",
        sortValue: (r) => r.ssdIssue,
        render: (r) => text(r.ssdIssue),
      },
      {
        id: "otherIssue",
        label: "Other",
        className: "w-[100px]",
        sortValue: (r) => r.otherIssue,
        render: (r) => text(r.otherIssue),
      },
      {
        id: "issueSource",
        label: "Source",
        className: "w-[100px]",
        sortValue: (r) => r.issueSource,
        render: (r) => text(r.issueSource),
      },
    ],
  },
  {
    id: "hardware",
    label: "Hardware",
    columns: [
      {
        id: "motherboardType",
        label: "MB Type",
        className: "min-w-[7.5rem] w-[120px]",
        sortValue: (r) => r.motherboardType ?? "",
        render: (r) => text(r.motherboardType),
      },
      {
        id: "pmmType",
        label: "PMM Type",
        className: "w-[110px]",
        sortValue: (r) => r.pmmType ?? "",
        render: (r) => text(r.pmmType),
      },
    ],
  },
  {
    id: "storage",
    label: "Storage",
    columns: [
      {
        id: "ssdType",
        label: "SSD Type",
        className: "w-[110px]",
        sortValue: (r) => r.ssdType ?? "",
        render: (r) => text(r.ssdType),
      },
      {
        id: "diskHealth",
        label: "Disk Health",
        className: "w-[100px]",
        sortValue: (r) => r.diskHealth ?? null,
        render: (r) => bool(r.diskHealth),
      },
      {
        id: "powerOnHours",
        label: "POH",
        className: "w-[90px]",
        sortable: false,
        render: (r) => <CellWrap>{formatCount(r.powerOnHours)}</CellWrap>,
      },
      {
        id: "powerCycles",
        label: "Cycles",
        className: "w-[90px]",
        sortable: false,
        render: (r) => <CellWrap>{formatCount(r.powerCycles)}</CellWrap>,
      },
      {
        id: "powerOffCount",
        label: "Power Off",
        className: "w-[90px]",
        sortable: false,
        render: (r) => <CellWrap>{formatCount(r.powerOffCount)}</CellWrap>,
      },
      {
        id: "lifetime",
        label: "Lifetime",
        className: "w-[80px]",
        sortable: false,
        render: (r) => <CellWrap>{formatCount(r.lifetime)}</CellWrap>,
      },
      {
        id: "summarySsd",
        label: "SSD Summary",
        className: "min-w-[140px]",
        sortable: false,
        render: (r) => text(r.summarySsd),
      },
    ],
  },
  {
    id: "replacements",
    label: "Replacements",
    columns: [
      { id: "ssd", label: "SSD", className: "w-[88px]", sortable: false, render: (r) => text(r.ssd) },
      {
        id: "motherboard",
        label: "MB Repl.",
        className: "w-[88px]",
        sortable: false,
        render: (r) => text(r.motherboard),
      },
      {
        id: "sataCable",
        label: "SATA",
        className: "w-[80px]",
        sortable: false,
        render: (r) => text(r.sataCable),
      },
      {
        id: "imeiChanged",
        label: "IMEI Δ",
        className: "w-[88px]",
        sortable: false,
        render: (r) => replacementDbValue(r.imeiChanged),
      },
      {
        id: "simChanged",
        label: "SIM Δ",
        className: "w-[80px]",
        sortable: false,
        render: (r) => replacementDbValue(r.simChanged),
      },
      {
        id: "deviceChanged",
        label: "Device Δ",
        className: "w-[88px]",
        sortable: false,
        render: (r) => bool(r.deviceChanged),
      },
    ],
  },
  {
    id: "meta",
    label: "Meta",
    columns: [
      {
        id: "createdAt",
        label: "Created",
        className: "w-[150px]",
        sortValue: (r) => r.createdAt,
        render: (r) => (
          <span className="whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400">
            {formatDisplayDate(r.createdAt)}
          </span>
        ),
      },
      {
        id: "description",
        label: "Description",
        className: "min-w-[200px] max-w-[320px]",
        sortValue: (r) => r.description,
        render: (r) => text(r.description),
      },
    ],
  },
];

export const ISSUES_TABLE_COLUMNS = ISSUES_TABLE_GROUPS.flatMap((g) => g.columns);

export const ISSUES_COLUMN_OPTIONS = ISSUES_TABLE_GROUPS.flatMap((g) =>
  g.columns.map((c) => ({
    key: c.id,
    label: c.label,
    group: g.label,
    locked: c.hideable === false,
  })),
);

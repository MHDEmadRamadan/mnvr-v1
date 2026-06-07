/** Report results table + export column definitions — separate from Issues dashboard config. */

export type ReportColumnDef = {
  id: string;
  label: string;
};

export const REPORT_EXPORT_COLUMNS: { id: string; label: string }[] = [
  { id: "vehicleNumber", label: "Vehicle" },
  { id: "deviceImei", label: "IMEI" },
  { id: "deviceTickets", label: "Tickets" },
  { id: "issueType", label: "Issue Type" },
  { id: "motherboardIssue", label: "Motherboard Issue" },
  { id: "pmmIssue", label: "PMM Issue" },
  { id: "ssdIssue", label: "SSD Issue" },
  { id: "otherIssue", label: "Other Issue" },
  { id: "issueSource", label: "Source" },
  { id: "motherboardType", label: "Motherboard Type" },
  { id: "pmmType", label: "PMM Type" },
  { id: "ssdType", label: "SSD Type" },
  { id: "softwareVersion", label: "Software" },
  { id: "flespiStatus", label: "Flespi" },
  { id: "screenStatus", label: "Screen" },
  { id: "dotMatrixStatus", label: "Dotmatrix" },
  { id: "sshStatus", label: "SSH" },
  { id: "ssd", label: "SSD Replacement" },
  { id: "motherboard", label: "Motherboard Replacement" },
  { id: "sataCable", label: "SATA Cable" },
  { id: "imeiChanged", label: "IMEI Changed" },
  { id: "simChanged", label: "SIM Changed" },
  { id: "deviceChanged", label: "Device Changed" },
  { id: "pmmSoftware", label: "pmm_software" },
  { id: "description", label: "Description" },
  { id: "createdAt", label: "Created" },
];

export const REPORT_TABLE_COLUMNS = REPORT_EXPORT_COLUMNS.filter((c) =>
  [
    "vehicleNumber",
    "deviceImei",
    "issueType",
    "motherboardIssue",
    "pmmIssue",
    "ssdIssue",
    "issueSource",
    "motherboardType",
    "pmmType",
    "ssdType",
    "createdAt",
  ].includes(c.id),
);

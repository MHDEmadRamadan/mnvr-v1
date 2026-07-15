import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Issue } from "@/types/issue";
import { formatMaintenanceRecordForClipboard } from "./format-maintenance-record-clipboard";

function sampleIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    deviceId: "00000000-0000-4000-8000-000000000002",
    issueType: "SSD Failure",
    motherboardIssue: "",
    pmmIssue: "",
    ssdIssue: "Read errors",
    otherIssue: "",
    description: "First line\nSecond line",
    createdAt: "2026-07-11T10:15:00.000Z",
    status: "open",
    createdByName: "Ahmed",
    editedByName: null,
    editedAt: null,
    vehicleNumber: "12345",
    vehicleDescription: "Bus 12",
    deviceImei: "123456789012345",
    deviceDescription: null,
    deviceTickets: "INC-1234",
    softwareVersion: "1.2.3",
    flespiStatus: "online",
    screenStatus: null,
    dotMatrixStatus: null,
    sshStatus: true,
    pmmSoftware: 4.5,
    deviceStatusDescription: null,
    motherboardType: "MB-A",
    pmmType: null,
    hardwareDescription: null,
    ssdType: "Samsung",
    diskHealth: false,
    powerOnHours: 1200,
    powerCycles: null,
    powerOffCount: null,
    lifetime: null,
    summarySsd: null,
    storageDescription: null,
    ssd: "NEW",
    motherboard: "NO CHANGE",
    sataCable: "NO CHANGE",
    imeiChanged: "867530012345678",
    simChanged: null,
    deviceChanged: true,
    replacementsDescription: null,
    ...overrides,
  };
}

describe("formatMaintenanceRecordForClipboard", () => {
  it("includes all required section headings in order", () => {
    const text = formatMaintenanceRecordForClipboard(sampleIssue());
    const titles = [
      "Vehicle Information",
      "Device Information",
      "Device Status",
      "Hardware",
      "Storage",
      "Replacements",
      "Issue Information",
    ];
    let lastIndex = -1;
    for (const title of titles) {
      const index = text.indexOf(title);
      assert.ok(index > lastIndex, `missing or out of order: ${title}`);
      lastIndex = index;
    }
  });

  it("uses N/A for empty values and Yes/No for booleans", () => {
    const text = formatMaintenanceRecordForClipboard(sampleIssue());
    assert.match(text, /Device Description\s+: N\/A/);
    assert.match(text, /SSH Status\s+: Yes/);
    assert.match(text, /Disk Health\s+: No/);
    assert.match(text, /Device Changed\s+: Yes/);
    assert.match(text, /SIM Changed\s+: N\/A/);
  });

  it("preserves description line breaks with aligned continuation", () => {
    const text = formatMaintenanceRecordForClipboard(sampleIssue());
    assert.match(text, /Description\s+: First line\n\s+Second line/);
  });

  it("includes IMEI change value when present", () => {
    const text = formatMaintenanceRecordForClipboard(sampleIssue());
    assert.match(text, /IMEI Changed\s+: 867530012345678/);
  });

  it("is deterministic and has no triple blank lines", () => {
    const a = formatMaintenanceRecordForClipboard(sampleIssue());
    const b = formatMaintenanceRecordForClipboard(sampleIssue());
    assert.equal(a, b);
    assert.equal(/\n{3,}/.test(a), false);
  });

  it("starts with Maintenance Record banner", () => {
    const text = formatMaintenanceRecordForClipboard(sampleIssue());
    assert.ok(text.startsWith("========================================\nMaintenance Record\n========================================"));
  });

  it("formats status as Open/Resolved", () => {
    assert.match(
      formatMaintenanceRecordForClipboard(sampleIssue({ status: "resolved" })),
      /Status\s+: Resolved/,
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dbReplacementValueToUi,
  formReplacementValueToDb,
  formatReplacementDbValueForDisplay,
  hasReplacementChange,
  isReplacementNoChange,
  normalizeFormReplacementValue,
  sanitizeReplacementValueForDb,
} from "./replacements-value-mapper";
import { issueToMaintenanceForm, maintenanceFormToRpcPayload, mapIssueFromRow } from "./issues-mapper";
import type { Issue } from "@/types/issue";
import { emptyMaintenanceRecordForm } from "@/types/maintenance-record";

describe("dbReplacementValueToUi — read path", () => {
  it("maps no-change literals to null", () => {
    assert.equal(dbReplacementValueToUi(null, "imei_changed"), null);
    assert.equal(dbReplacementValueToUi(undefined, "imei_changed"), null);
    assert.equal(dbReplacementValueToUi(false, "imei_changed"), null);
    assert.equal(dbReplacementValueToUi("false", "imei_changed"), null);
    assert.equal(dbReplacementValueToUi("", "imei_changed"), null);
    assert.equal(dbReplacementValueToUi("No", "sim_changed"), null);
  });

  it("legacy PostgreSQL boolean true → null without treating as app leak", () => {
    assert.equal(dbReplacementValueToUi(true, "imei_changed"), null);
    assert.equal(dbReplacementValueToUi(true, "sim_changed"), null);
  });

  it("preserves real IMEI/SIM strings", () => {
    assert.equal(dbReplacementValueToUi("867530012345678", "imei_changed"), "867530012345678");
    assert.equal(dbReplacementValueToUi("  SIM-99  ", "sim_changed"), "SIM-99");
  });

  it("legacy Yes/true flag strings → null", () => {
    assert.equal(dbReplacementValueToUi("Yes", "imei_changed"), null);
    assert.equal(dbReplacementValueToUi("true", "sim_changed"), null);
  });
});

describe("normalizeFormReplacementValue — form path", () => {
  it("rejects boolean leak → null", () => {
    assert.equal(normalizeFormReplacementValue(true, "imei_changed"), null);
    assert.equal(normalizeFormReplacementValue(false, "sim_changed"), null);
  });

  it("accepts string values", () => {
    assert.equal(normalizeFormReplacementValue("867530012345678", "imei_changed"), "867530012345678");
  });
});

describe("formReplacementValueToDb", () => {
  it("empty/null → \"false\"", () => {
    assert.equal(formReplacementValueToDb(null), "false");
    assert.equal(formReplacementValueToDb(undefined), "false");
    assert.equal(formReplacementValueToDb(""), "false");
    assert.equal(formReplacementValueToDb("   "), "false");
  });

  it("boolean leak → \"true\" / \"false\" for legacy DB RPC cast", () => {
    assert.equal(formReplacementValueToDb(true as unknown as string, "imei_changed"), "true");
    assert.equal(formReplacementValueToDb(false as unknown as string, "imei_changed"), "false");
  });

  it("string → trimmed value", () => {
    assert.equal(formReplacementValueToDb("867530012345678"), "867530012345678");
    assert.equal(formReplacementValueToDb("  SIM-1  "), "SIM-1");
  });
});

describe("sanitizeReplacementValueForDb", () => {
  it("never returns boolean", () => {
    assert.equal(typeof sanitizeReplacementValueForDb(true, "imei_changed"), "string");
    assert.equal(sanitizeReplacementValueForDb(true, "imei_changed"), "true");
    assert.equal(sanitizeReplacementValueForDb(false, "imei_changed"), "false");
    assert.equal(sanitizeReplacementValueForDb("867530012345678", "imei_changed"), "867530012345678");
  });

  it("preserves numeric DB values for form edit", () => {
    assert.equal(dbReplacementValueToUi(0, "imei_changed"), null);
    assert.equal(dbReplacementValueToUi(1, "imei_changed"), "1");
  });
});

describe("isReplacementNoChange", () => {
  it("detects no-change values", () => {
    assert.equal(isReplacementNoChange(null), true);
    assert.equal(isReplacementNoChange(false), true);
    assert.equal(isReplacementNoChange("false"), true);
    assert.equal(isReplacementNoChange("867530012345678"), false);
  });
});

describe("formatReplacementDbValueForDisplay", () => {
  it("null/undefined → em dash (empty cell, not a semantic label)", () => {
    assert.equal(formatReplacementDbValueForDisplay(null), "—");
    assert.equal(formatReplacementDbValueForDisplay(undefined), "—");
  });

  it("preserves boolean and numeric DB values as strings", () => {
    assert.equal(formatReplacementDbValueForDisplay(false), "false");
    assert.equal(formatReplacementDbValueForDisplay(true), "true");
    assert.equal(formatReplacementDbValueForDisplay(0), "0");
    assert.equal(formatReplacementDbValueForDisplay(1), "1");
  });

  it("preserves string DB values", () => {
    assert.equal(formatReplacementDbValueForDisplay("867530012345678"), "867530012345678");
    assert.equal(formatReplacementDbValueForDisplay("false"), "false");
    assert.equal(formatReplacementDbValueForDisplay(""), "—");
  });
});

describe("hasReplacementChange", () => {
  it("detects presence of change value from raw DB shapes", () => {
    assert.equal(hasReplacementChange(null), false);
    assert.equal(hasReplacementChange(false), false);
    assert.equal(hasReplacementChange(true), true);
    assert.equal(hasReplacementChange(0), false);
    assert.equal(hasReplacementChange(1), true);
    assert.equal(hasReplacementChange(""), false);
    assert.equal(hasReplacementChange("false"), false);
    assert.equal(hasReplacementChange("867530012345678"), true);
  });
});

describe("maintenanceFormToRpcPayload — value fields", () => {
  it("defaults send \"false\" for imei_changed and sim_changed", () => {
    const payload = maintenanceFormToRpcPayload(emptyMaintenanceRecordForm());
    assert.equal(payload.imei_changed, "false");
    assert.equal(payload.sim_changed, "false");
  });

  it("sends actual IMEI/SIM strings", () => {
    const payload = maintenanceFormToRpcPayload({
      ...emptyMaintenanceRecordForm(),
      imeiChanged: "867530012345678",
      simChanged: "SIM-42",
    });
    assert.equal(payload.imei_changed, "867530012345678");
    assert.equal(payload.sim_changed, "SIM-42");
  });
});

describe("issueToMaintenanceForm — edit load", () => {
  it("loads null for no change and string for value", () => {
    const issue: Issue = {
      id: "00000000-0000-4000-8000-000000000001",
      deviceId: "00000000-0000-4000-8000-000000000002",
      issueType: "test",
      motherboardIssue: "",
      pmmIssue: "",
      ssdIssue: "",
      otherIssue: "",
      description: "",
      createdAt: new Date().toISOString(),
      imeiChanged: true,
      simChanged: "SIM-99",
      deviceChanged: false,
    };

    const form = issueToMaintenanceForm(issue);
    assert.equal(form.imeiChanged, null);
    assert.equal(form.simChanged, "SIM-99");
  });

  it("mapIssueFromRow preserves raw PostgreSQL boolean values for display", () => {
    const row = {
      id: "00000000-0000-4000-8000-000000000001",
      device_id: "00000000-0000-4000-8000-000000000002",
      issue_type: "test",
      motherboard_issue: "",
      pmm_issue: "",
      ssd_issue: "",
      other_issue: "",
      description: "",
      created_at: new Date().toISOString(),
      device: {
        id: "00000000-0000-4000-8000-000000000002",
        imei: "123456789012345",
        description: "",
        tickets: "",
        replacements: {
          id: "00000000-0000-4000-8000-000000000003",
          ssd: null,
          motherboard: null,
          sata_cable: null,
          imei_changed: true,
          sim_changed: false,
          device_changed: false,
          description: "",
          created_at: new Date().toISOString(),
        },
      },
    };

    const issue = mapIssueFromRow(row);
    assert.equal(issue.imeiChanged, true);
    assert.equal(issue.simChanged, false);
    assert.equal(formatReplacementDbValueForDisplay(issue.imeiChanged), "true");
    assert.equal(formatReplacementDbValueForDisplay(issue.simChanged), "false");

    const form = issueToMaintenanceForm(issue);
    assert.equal(form.imeiChanged, null);
    assert.equal(form.simChanged, null);
  });
});

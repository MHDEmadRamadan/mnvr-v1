import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAINTENANCE_FORM_FIELDS,
  MAINTENANCE_FORM_SECTIONS,
  fieldsForSection,
} from "@/config/maintenance-form-config";
import {
  applyMaintenanceFormPatch,
  isReplacementChangeRequired,
} from "@/lib/maintenance-form-patch";
import { validateMaintenanceRecordForm } from "@/lib/maintenance-record-schema";
import { emptyMaintenanceRecordForm } from "@/types/maintenance-record";

const HIDDEN_DESCRIPTION_KEYS = new Set([
  "vehicleDescription",
  "deviceDescription",
  "deviceStatusDescription",
  "hardwareDescription",
  "storageDescription",
  "replacementsDescription",
]);

describe("maintenance form sections", () => {
  it("only Issue Information has a section description", () => {
    const withDescription = MAINTENANCE_FORM_SECTIONS.filter((s) => s.description);
    assert.equal(withDescription.length, 1);
    assert.equal(withDescription[0]?.id, "issue");
    assert.equal(withDescription[0]?.description, "Issue description");
  });

  it("hides description textarea fields from the form UI", () => {
    for (const key of HIDDEN_DESCRIPTION_KEYS) {
      const field = MAINTENANCE_FORM_FIELDS.find((f) => f.key === key);
      assert.ok(field?.hidden, `expected ${key} to be hidden`);
      assert.equal(fieldsForSection(field!.section).some((f) => f.key === key), false);
    }
  });

  it("shows issue description textarea without a duplicate field label", () => {
    const issueFields = fieldsForSection("issue");
    const issueDescription = issueFields.find((f) => f.key === "issueDescription");
    assert.ok(issueDescription);
    assert.equal(issueDescription?.hideLabel, true);
  });
});

describe("device changed replacement automation", () => {
  it("checks IMEI and SIM changed without auto-filling replacement values", () => {
    const prev = emptyMaintenanceRecordForm();
    const next = applyMaintenanceFormPatch(prev, { deviceChanged: true });
    assert.equal(next.deviceChanged, true);
    assert.equal(next.imeiChanged, "");
    assert.equal(next.simChanged, "");
  });

  it("does not overwrite existing replacement values when device changed was already true", () => {
    const prev = {
      ...emptyMaintenanceRecordForm(),
      deviceChanged: true,
      imeiChanged: "352625123456789",
      simChanged: "8944501234567890123",
    };
    const next = applyMaintenanceFormPatch(prev, { deviceChanged: true });
    assert.equal(next.imeiChanged, "352625123456789");
    assert.equal(next.simChanged, "8944501234567890123");
  });

  it("does not clear IMEI/SIM when device changed is turned off", () => {
    const prev = {
      ...emptyMaintenanceRecordForm(),
      deviceChanged: true,
      imeiChanged: "352625123456789",
      simChanged: "8944501234567890123",
    };
    const next = applyMaintenanceFormPatch(prev, { deviceChanged: false });
    assert.equal(next.deviceChanged, false);
    assert.equal(next.imeiChanged, "352625123456789");
    assert.equal(next.simChanged, "8944501234567890123");
  });

  it("requires checked IMEI/SIM with non-empty replacement values when device changed is true", () => {
    const unchecked = isReplacementChangeRequired({
      deviceChanged: true,
      imeiChanged: null,
      simChanged: null,
    });
    assert.ok(unchecked.imeiChanged);
    assert.ok(unchecked.simChanged);

    const checkedEmpty = isReplacementChangeRequired({
      deviceChanged: true,
      imeiChanged: "",
      simChanged: "",
    });
    assert.ok(checkedEmpty.imeiChanged);
    assert.ok(checkedEmpty.simChanged);
  });

  it("blocks save when device changed is true and replacement values are empty", () => {
    const result = validateMaintenanceRecordForm({
      ...emptyMaintenanceRecordForm(),
      vehicleNumber: "V-100",
      imei: "352625123456789",
      issueType: "Hardware",
      deviceChanged: true,
      imeiChanged: "",
      simChanged: "",
    });
    assert.equal(result.success, false);
    if (result.success) return;
    assert.ok(result.errors.imeiChanged);
    assert.ok(result.errors.simChanged);
  });

  it("allows save when device changed is true and replacement values are filled", () => {
    const result = validateMaintenanceRecordForm({
      ...emptyMaintenanceRecordForm(),
      vehicleNumber: "V-100",
      imei: "352625123456789",
      issueType: "Hardware",
      deviceChanged: true,
      imeiChanged: "352625123456790",
      simChanged: "8944501234567890124",
    });
    assert.equal(result.success, true);
  });
});

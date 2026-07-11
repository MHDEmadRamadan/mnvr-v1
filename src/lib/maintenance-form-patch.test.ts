import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAINTENANCE_FORM_FIELDS,
  MAINTENANCE_FORM_SECTIONS,
  fieldsForSection,
} from "@/config/maintenance-form-config";
import { applyMaintenanceFormPatch, validateReplacementValueFields } from "@/lib/maintenance-form-patch";
import { validateMaintenanceRecordForm } from "@/lib/maintenance-record-schema";
import { maintenanceFormToRpcPayload } from "@/lib/issues-mapper";
import { emptyMaintenanceRecordForm } from "@/types/maintenance-record";

const HIDDEN_DESCRIPTION_KEYS = new Set([
  "vehicleDescription",
  "deviceDescription",
  "deviceStatusDescription",
  "hardwareDescription",
  "storageDescription",
  "replacementsDescription",
]);

const BASE_REQUIRED = {
  vehicleNumber: "V-100",
  imei: "352625123456789",
  issueType: "Hardware",
} as const;

const IMEI_VALUE = "352625123456790";
const SIM_VALUE = "8944501234567890124";

function validForm(
  overrides: Partial<ReturnType<typeof emptyMaintenanceRecordForm>>,
) {
  return { ...emptyMaintenanceRecordForm(), ...BASE_REQUIRED, ...overrides };
}

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

  it("shows issue description textarea with a visible field label", () => {
    const issueFields = fieldsForSection("issue");
    const issueDescription = issueFields.find((f) => f.key === "issueDescription");
    assert.ok(issueDescription);
    assert.equal(issueDescription?.label, "Description");
    assert.notEqual(issueDescription?.hideLabel, true);
  });
});

describe("applyMaintenanceFormPatch — device changed one-way trigger", () => {
  it("auto-enables IMEI and SIM when device changed is turned on", () => {
    const prev = emptyMaintenanceRecordForm();
    const next = applyMaintenanceFormPatch(prev, { deviceChanged: true });
    assert.equal(next.deviceChanged, true);
    assert.equal(next.imeiChanged, "");
    assert.equal(next.simChanged, "");
  });

  it("does not overwrite existing IMEI/SIM values when device changed is turned on", () => {
    const prev = {
      ...emptyMaintenanceRecordForm(),
      imeiChanged: IMEI_VALUE,
      simChanged: null,
    };
    const next = applyMaintenanceFormPatch(prev, { deviceChanged: true });
    assert.equal(next.imeiChanged, IMEI_VALUE);
    assert.equal(next.simChanged, "");
  });

  it("does not clear IMEI/SIM when device changed is turned off", () => {
    const prev = {
      ...emptyMaintenanceRecordForm(),
      deviceChanged: true,
      imeiChanged: IMEI_VALUE,
      simChanged: SIM_VALUE,
    };
    const next = applyMaintenanceFormPatch(prev, { deviceChanged: false });
    assert.equal(next.deviceChanged, false);
    assert.equal(next.imeiChanged, IMEI_VALUE);
    assert.equal(next.simChanged, SIM_VALUE);
  });

  it("user can disable IMEI only after device changed auto-enabled both", () => {
    let state = applyMaintenanceFormPatch(emptyMaintenanceRecordForm(), { deviceChanged: true });
    assert.equal(state.imeiChanged, "");
    assert.equal(state.simChanged, "");

    state = applyMaintenanceFormPatch(state, { imeiChanged: null });
    assert.equal(state.deviceChanged, true);
    assert.equal(state.imeiChanged, null);
    assert.equal(state.simChanged, "");
  });

  it("user can disable SIM only after device changed auto-enabled both", () => {
    let state = applyMaintenanceFormPatch(emptyMaintenanceRecordForm(), { deviceChanged: true });
    state = applyMaintenanceFormPatch(state, { simChanged: null });
    assert.equal(state.deviceChanged, true);
    assert.equal(state.imeiChanged, "");
    assert.equal(state.simChanged, null);
  });

  it("does not re-trigger auto-enable when device changed stays on", () => {
    let state = applyMaintenanceFormPatch(emptyMaintenanceRecordForm(), { deviceChanged: true });
    state = applyMaintenanceFormPatch(state, { imeiChanged: null, simChanged: null });
    state = applyMaintenanceFormPatch(state, { deviceChanged: true });
    assert.equal(state.imeiChanged, null);
    assert.equal(state.simChanged, null);
  });

  it("only applies the patched keys for unrelated updates", () => {
    const prev = emptyMaintenanceRecordForm();
    const next = applyMaintenanceFormPatch(prev, { imeiChanged: IMEI_VALUE });
    assert.equal(next.imeiChanged, IMEI_VALUE);
    assert.equal(next.deviceChanged, false);
    assert.equal(next.simChanged, null);
  });
});

describe("validateReplacementValueFields", () => {
  it("requires a value only when IMEI/SIM changed is checked but empty", () => {
    assert.deepEqual(validateReplacementValueFields({ imeiChanged: null, simChanged: null }), {});
    assert.deepEqual(
      validateReplacementValueFields({ imeiChanged: IMEI_VALUE, simChanged: null }),
      {},
    );
    assert.ok(validateReplacementValueFields({ imeiChanged: "", simChanged: null }).imeiChanged);
    assert.ok(validateReplacementValueFields({ imeiChanged: null, simChanged: "" }).simChanged);
  });
});

describe("replacement field combinations — device / IMEI / SIM independent", () => {
  const combinations: {
    name: string;
    deviceChanged: boolean;
    imeiChanged: string | null;
    simChanged: string | null;
  }[] = [
    { name: "device off, no IMEI/SIM changes", deviceChanged: false, imeiChanged: null, simChanged: null },
    { name: "device off, IMEI only", deviceChanged: false, imeiChanged: IMEI_VALUE, simChanged: null },
    { name: "device off, SIM only", deviceChanged: false, imeiChanged: null, simChanged: SIM_VALUE },
    { name: "device off, IMEI and SIM", deviceChanged: false, imeiChanged: IMEI_VALUE, simChanged: SIM_VALUE },
    { name: "device on, IMEI only", deviceChanged: true, imeiChanged: IMEI_VALUE, simChanged: null },
    { name: "device on, SIM only", deviceChanged: true, imeiChanged: null, simChanged: SIM_VALUE },
    { name: "device on, IMEI and SIM", deviceChanged: true, imeiChanged: IMEI_VALUE, simChanged: SIM_VALUE },
    { name: "device on, neither IMEI nor SIM", deviceChanged: true, imeiChanged: null, simChanged: null },
  ];

  for (const combo of combinations) {
    it(`accepts save: ${combo.name}`, () => {
      const result = validateMaintenanceRecordForm(
        validForm({
          deviceChanged: combo.deviceChanged,
          imeiChanged: combo.imeiChanged,
          simChanged: combo.simChanged,
        }),
      );
      assert.equal(result.success, true, `expected valid: ${combo.name}`);
    });

    it(`maps RPC payload: ${combo.name}`, () => {
      const payload = maintenanceFormToRpcPayload(
        validForm({
          deviceChanged: combo.deviceChanged,
          imeiChanged: combo.imeiChanged,
          simChanged: combo.simChanged,
        }),
      );
      assert.equal(payload.device_changed, combo.deviceChanged);
      assert.equal(payload.imei_changed, combo.imeiChanged ?? "false");
      assert.equal(payload.sim_changed, combo.simChanged ?? "false");
    });
  }

  it("blocks save when IMEI changed is checked but empty (independent of device changed)", () => {
    for (const deviceChanged of [false, true]) {
      const result = validateMaintenanceRecordForm(
        validForm({ deviceChanged, imeiChanged: "", simChanged: null }),
      );
      assert.equal(result.success, false);
      if (result.success) return;
      assert.ok(result.errors.imeiChanged);
      assert.equal(result.errors.simChanged, undefined);
    }
  });
});

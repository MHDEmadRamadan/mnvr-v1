import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getFirstErrorKey,
  getSectionsWithErrors,
  reconcileFieldErrors,
} from "./form-validation";

describe("form-validation utilities", () => {
  it("getFirstErrorKey respects field order", () => {
    const errors = { issueType: "Required", imei: "Required", vehicleNumber: "Required" };
    assert.equal(getFirstErrorKey(errors, ["vehicleNumber", "imei", "issueType"]), "vehicleNumber");
  });

  it("reconcileFieldErrors clears fixed fields and keeps unrelated errors", () => {
    const prev = { email: "Required", password: "Required" };
    const next = reconcileFieldErrors(prev, {}, ["email"]);
    assert.deepEqual(next, { password: "Required" });
  });

  it("getSectionsWithErrors maps fields to accordion sections", () => {
    const sections = getSectionsWithErrors(
      { vehicleNumber: "Required", issueType: "Required" },
      { vehicleNumber: "vehicle", issueType: "issue" },
    );
    assert.deepEqual([...sections].sort(), ["issue", "vehicle"]);
  });
});

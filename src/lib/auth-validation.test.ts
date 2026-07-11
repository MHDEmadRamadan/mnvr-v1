import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePasswordChange, validateNewPassword, validatePasswordStrength, validateLoginFields, validatePasswordChangeFields } from "./auth-validation";

describe("validatePasswordChange", () => {
  it("requires current password", () => {
    assert.equal(validatePasswordChange("", "newpassword", "newpassword"), "Current password is required.");
  });

  it("enforces minimum length", () => {
    assert.equal(validatePasswordChange("oldpass1", "short", "short"), "New password must be at least 8 characters.");
  });

  it("requires matching confirmation", () => {
    assert.equal(
      validatePasswordChange("oldpass1", "newpassword", "different"),
      "New passwords do not match.",
    );
  });

  it("rejects same password", () => {
    assert.equal(
      validatePasswordChange("samepass1", "samepass1", "samepass1"),
      "New password must be different from the current password.",
    );
  });

  it("accepts valid change", () => {
    assert.equal(validatePasswordChange("oldpass1", "newpassword", "newpassword"), null);
  });
});

describe("validatePasswordStrength", () => {
  it("requires letter and number", () => {
    assert.equal(validatePasswordStrength("password"), "Password must contain at least one letter and one number.");
    assert.equal(validatePasswordStrength("12345678"), "Password must contain at least one letter and one number.");
    assert.equal(validatePasswordStrength("Passw0rd"), null);
  });
});

describe("validateNewPassword", () => {
  it("requires matching confirmation", () => {
    assert.equal(validateNewPassword("Passw0rd", "Different1"), "Passwords do not match.");
  });
});

describe("validateLoginFields", () => {
  it("maps missing credentials to field keys", () => {
    assert.deepEqual(validateLoginFields("", ""), {
      email: "Email is required.",
      password: "Password is required.",
    });
  });
});

describe("validatePasswordChangeFields", () => {
  it("maps mismatch to confirmPassword", () => {
    const errors = validatePasswordChangeFields("oldpass1", "newpassword", "different");
    assert.equal(errors.confirmPassword, "New passwords do not match.");
  });
});

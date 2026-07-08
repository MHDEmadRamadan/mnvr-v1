import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { havePermissionsChanged } from "./auth-permissions";
import type { Profile } from "@/types/auth";

const baseProfile: Profile = {
  id: "user-1",
  email: "user@example.com",
  fullName: "Test User",
  role: "admin",
  disabledAt: null,
  permissionsVersion: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("havePermissionsChanged", () => {
  it("returns false when no previous profile", () => {
    assert.equal(havePermissionsChanged(null, baseProfile), false);
  });

  it("ignores profiles for other users", () => {
    assert.equal(
      havePermissionsChanged(baseProfile, { ...baseProfile, id: "other-user" }),
      false,
    );
  });

  it("detects role changes", () => {
    assert.equal(
      havePermissionsChanged(baseProfile, { ...baseProfile, role: "user" }),
      true,
    );
  });

  it("detects permissions version bumps", () => {
    assert.equal(
      havePermissionsChanged(baseProfile, { ...baseProfile, permissionsVersion: 2 }),
      true,
    );
  });

  it("detects disable state changes", () => {
    assert.equal(
      havePermissionsChanged(baseProfile, {
        ...baseProfile,
        disabledAt: "2026-01-02T00:00:00.000Z",
      }),
      true,
    );
  });

  it("returns false for unchanged permissions", () => {
    assert.equal(havePermissionsChanged(baseProfile, { ...baseProfile }), false);
  });
});

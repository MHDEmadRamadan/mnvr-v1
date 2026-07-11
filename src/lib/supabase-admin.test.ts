import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSupabaseAdminConfigError, isSupabaseAdminConfigured } from "./supabase-admin";

describe("supabase admin config", () => {
  it("reports missing config without throwing", () => {
    // In this test process, keys come from the local env / empty defaults.
    // We only assert the helper returns a string|null and never crashes.
    const err = getSupabaseAdminConfigError();
    assert.ok(err === null || typeof err === "string");
    assert.equal(typeof isSupabaseAdminConfigured(), "boolean");
    if (err === null) {
      assert.equal(isSupabaseAdminConfigured(), true);
    } else {
      assert.equal(isSupabaseAdminConfigured(), false);
    }
  });
});

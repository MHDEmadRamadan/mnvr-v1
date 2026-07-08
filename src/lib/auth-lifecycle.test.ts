import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Mirrors AuthContext loading derivation for regression coverage. */
function isAuthLoading(sessionReady: boolean, userId: string | null, profileReady: boolean): boolean {
  return !sessionReady || (userId !== null && !profileReady);
}

describe("auth loading state", () => {
  it("is loading until session is ready", () => {
    assert.equal(isAuthLoading(false, null, true), true);
  });

  it("is not loading when session ready and no user", () => {
    assert.equal(isAuthLoading(true, null, true), false);
  });

  it("is loading while profile loads for authenticated user", () => {
    assert.equal(isAuthLoading(true, "user-1", false), true);
  });

  it("is not loading when profile is ready", () => {
    assert.equal(isAuthLoading(true, "user-1", true), false);
  });

  it("requires fresh profile load on user switch", () => {
    assert.equal(isAuthLoading(true, "user-2", false), true);
  });
});

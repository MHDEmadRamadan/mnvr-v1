import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidAccessToken } from "./auth-token";

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";

describe("isValidAccessToken", () => {
  it("accepts a 3-segment JWT", () => {
    assert.equal(isValidAccessToken(SAMPLE_JWT), true);
  });

  it("rejects null, undefined, and empty", () => {
    assert.equal(isValidAccessToken(null), false);
    assert.equal(isValidAccessToken(undefined), false);
    assert.equal(isValidAccessToken(""), false);
  });

  it("rejects UUIDs (session invalidation bug)", () => {
    assert.equal(isValidAccessToken("521886ed-a31a-4ea1-9593-93e617fa310c"), false);
  });

  it("rejects stringified null/undefined", () => {
    assert.equal(isValidAccessToken("null"), false);
    assert.equal(isValidAccessToken("undefined"), false);
  });

  it("rejects values with Bearer prefix", () => {
    assert.equal(isValidAccessToken(`Bearer ${SAMPLE_JWT}`), false);
  });
});

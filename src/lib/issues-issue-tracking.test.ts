import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { profileDisplayName } from "./issues-mapper";

describe("profileDisplayName", () => {
  it("returns null when no user id", () => {
    assert.equal(profileDisplayName(null, null), null);
    assert.equal(profileDisplayName({ full_name: "A", email: null }, null), null);
  });

  it("prefers full name", () => {
    assert.equal(
      profileDisplayName({ full_name: "Jane Admin", email: "jane@example.com" }, "uuid-1"),
      "Jane Admin",
    );
  });

  it("falls back to email", () => {
    assert.equal(profileDisplayName({ full_name: "", email: "user@example.com" }, "uuid-1"), "user@example.com");
  });

  it("returns Unknown User when profile join is missing", () => {
    assert.equal(profileDisplayName(null, "521886ed-a31a-4ea1-9593-93e617fa310c"), "Unknown User");
  });
});

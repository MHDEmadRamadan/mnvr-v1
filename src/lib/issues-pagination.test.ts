import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GLOBAL_SEARCH_FIELDS } from "./issues-query";
import { computeTotalPages, clampPage } from "./issues/pipeline";
import { resolveFilterSort } from "./issues/filter-rpc";

describe("issues pagination helpers", () => {
  it("computes total pages and clamps page", () => {
    assert.equal(computeTotalPages(0, 10), 1);
    assert.equal(computeTotalPages(1001, 100), 11);
    assert.equal(clampPage(99, 5), 5);
    assert.equal(clampPage(0, 5), 1);
  });

  it("resolves issue table sort columns for the filter RPC", () => {
    assert.deepEqual(resolveFilterSort({ key: "issueType", direction: "asc" }), {
      sortKey: "issue_type",
      ascending: true,
    });
    assert.deepEqual(resolveFilterSort({ key: "createdAt", direction: "desc" }), {
      sortKey: "created_at",
      ascending: false,
    });
  });

  it("resolves nested device sort columns for the filter RPC", () => {
    assert.deepEqual(resolveFilterSort({ key: "deviceImei", direction: "asc" }), {
      sortKey: "imei",
      ascending: true,
    });
  });

  it("lists global search fields used by SQL RPC", () => {
    assert.ok(GLOBAL_SEARCH_FIELDS.length >= 10);
    assert.ok(GLOBAL_SEARCH_FIELDS.includes("hardware.motherboard_type"));
  });
});

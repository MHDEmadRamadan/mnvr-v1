import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildGlobalSearchOr,
  buildIssuesSelect,
  escapeIlikePattern,
  needsDeviceInnerJoin,
  needsStatusInnerJoin,
  resolveIssueSort,
} from "./issues-query";
import { computeTotalPages, clampPage } from "./issues/pipeline";

describe("issues pagination helpers", () => {
  it("computes total pages and clamps page", () => {
    assert.equal(computeTotalPages(0, 10), 1);
    assert.equal(computeTotalPages(1001, 100), 11);
    assert.equal(clampPage(99, 5), 5);
    assert.equal(clampPage(0, 5), 1);
  });

  it("detects inner join requirements", () => {
    assert.equal(needsDeviceInnerJoin({}), false);
    assert.equal(needsDeviceInnerJoin({ deviceImei: "123" }), true);
    assert.equal(needsDeviceInnerJoin({ vehicleNumber: "V1" }), true);
    assert.equal(needsDeviceInnerJoin({ globalSearch: "abc" }), true);
    assert.equal(needsStatusInnerJoin({ flespiStatus: "ok" }), true);
    assert.equal(needsStatusInnerJoin({}), false);
  });

  it("uses inner device join when filtering by IMEI", () => {
    const select = buildIssuesSelect({ deviceImei: "12345" });
    assert.match(select, /device:device_id!inner/);
  });

  it("uses default left joins without active filters", () => {
    const select = buildIssuesSelect({});
    assert.doesNotMatch(select, /device:device_id!inner/);
    assert.doesNotMatch(select, /device_status!inner/);
  });

  it("resolves issue table sort columns", () => {
    assert.deepEqual(resolveIssueSort({ key: "issueType", direction: "asc" }), {
      column: "issue_type",
      ascending: true,
    });
    assert.deepEqual(resolveIssueSort({ key: "createdAt", direction: "desc" }), {
      column: "created_at",
      ascending: false,
    });
  });

  it("resolves nested device sort columns", () => {
    assert.deepEqual(resolveIssueSort({ key: "deviceImei", direction: "asc" }), {
      column: "imei",
      ascending: true,
      foreignTable: "device",
    });
  });

  it("escapes ilike wildcards", () => {
    assert.equal(escapeIlikePattern("100%"), "100\\%");
    assert.equal(escapeIlikePattern("a_b"), "a\\_b");
  });

  it("builds global search OR filter", () => {
    const or = buildGlobalSearchOr("truck 01");
    assert.match(or, /issue_type\.ilike\./);
    assert.match(or, /device\.imei\.ilike\./);
    assert.match(or, /device\.vehicle\.vehicle_number\.ilike\./);
  });
});

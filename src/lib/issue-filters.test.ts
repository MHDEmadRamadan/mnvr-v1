import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADVANCED_ISSUE_FILTER_FIELDS,
  ISSUE_FILTER_FIELDS,
  PRIMARY_ISSUE_FILTER_IDS,
} from "@/config/issue-filter-catalog";
import {
  countActiveFilters,
  defaultFilterState,
  getActiveFilterChips,
  mergeFiltersIntoParams,
  parseFiltersFromParams,
  serializeFiltersToParams,
  toIssueQueryFilters,
} from "@/lib/issue-filters";
import { GLOBAL_SEARCH_FIELDS } from "@/lib/issues-query";
import {
  issueQueryFiltersToRpcPayload,
  reportFiltersToIssueQueryFilters,
} from "@/lib/issues/filter-rpc";
import {
  buildOrFilterClauses,
  describeOrFilterExpression,
} from "@/lib/issues/filter-combine";
import { defaultReportFilters } from "@/lib/reports/reports-filters";

describe("issue filter catalog", () => {
  it("exposes primary filters for the default bar", () => {
    assert.ok(PRIMARY_ISSUE_FILTER_IDS.includes("globalSearch"));
    assert.ok(PRIMARY_ISSUE_FILTER_IDS.includes("date"));
    assert.ok(PRIMARY_ISSUE_FILTER_IDS.includes("vehicleNumber"));
    assert.ok(PRIMARY_ISSUE_FILTER_IDS.includes("deviceImei"));
    assert.ok(PRIMARY_ISSUE_FILTER_IDS.includes("issueType"));
  });

  it("keeps advanced issue-information multi-select fields", () => {
    const ids = ADVANCED_ISSUE_FILTER_FIELDS.map((f) => f.id);
    assert.ok(ids.includes("motherboardIssue"));
    assert.ok(ids.includes("pmmIssue"));
    assert.ok(ids.includes("ssdIssue"));
    assert.ok(ids.includes("softwareVersion"));
    assert.ok(ids.includes("dotmatrixStatus"));
  });

  it("has unique field ids", () => {
    const ids = ISSUE_FILTER_FIELDS.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe("issue filter URL + query mapping", () => {
  it("round-trips multi-value filters through URL params", () => {
    const state = {
      ...defaultFilterState(),
      issueType: ["LV", "Out of warranty"],
      motherboardIssue: ["RAM", "Power"],
      vehicleNumber: ["TEST-75"],
    };
    const parsed = parseFiltersFromParams(serializeFiltersToParams(state));
    assert.deepEqual(parsed.issueType, ["LV", "Out of warranty"]);
    assert.deepEqual(parsed.motherboardIssue, ["RAM", "Power"]);
    assert.deepEqual(parsed.vehicleNumber, ["TEST-75"]);
  });

  it("preserves every Issue Type while merging filters into the page URL", () => {
    const state = {
      ...defaultFilterState(),
      issueType: ["LV", "SSD Issue", "PMM Issue"],
    };
    const merged = mergeFiltersIntoParams(
      new URLSearchParams("view=compact&issueType=stale"),
      state,
    );

    assert.equal(merged.get("view"), "compact");
    assert.deepEqual(merged.getAll("issueType"), [
      "LV",
      "SSD Issue",
      "PMM Issue",
    ]);
    assert.deepEqual(parseFiltersFromParams(merged).issueType, [
      "LV",
      "SSD Issue",
      "PMM Issue",
    ]);
  });

  it("maps multi-select UI state into query filters", () => {
    const q = toIssueQueryFilters({
      ...defaultFilterState(),
      motherboardIssue: ["RAM", "Power"],
      pmmIssue: ["FW Update"],
      ssdIssue: ["I/O"],
      deviceChanged: "true",
    });
    assert.deepEqual(q.motherboardIssue, ["RAM", "Power"]);
    assert.equal(q.pmmIssue, "FW Update");
    assert.equal(q.ssdIssue, "I/O");
    assert.equal(q.deviceChanged, true);
  });

  it("counts one chip per selected multi value", () => {
    assert.equal(countActiveFilters(defaultFilterState()), 0);
    const chips = getActiveFilterChips({
      ...defaultFilterState(),
      motherboardIssue: ["RAM", "Power"],
    });
    assert.equal(chips.length, 2);
  });
});

describe("shared filter RPC payload", () => {
  it("serializes multi-value filters as JSON arrays", () => {
    const payload = issueQueryFiltersToRpcPayload({
      issueType: ["LV", "SSD Issue", "PMM Issue"],
      motherboardIssue: ["RAM", "Power"],
      pmmIssue: "FW Update",
      vehicleNumber: ["74108520"],
    });
    assert.deepEqual(payload.issueType, ["LV", "SSD Issue", "PMM Issue"]);
    assert.deepEqual(payload.motherboardIssue, ["RAM", "Power"]);
    assert.equal(payload.pmmIssue, "FW Update");
    assert.equal(payload.vehicleNumber, "74108520");
  });

  it("maps report filters into the shared issue filter shape", () => {
    const mapped = reportFiltersToIssueQueryFilters({
      ...defaultReportFilters(),
      issueType: "LV",
      deviceChanged: "true",
      sshStatus: "false",
    });
    assert.equal(mapped.issueType, "LV");
    assert.equal(mapped.deviceChanged, true);
    assert.equal(mapped.sshStatus, false);
  });
});

describe("global search coverage", () => {
  it("documents SQL-backed searchable fields", () => {
    assert.ok(GLOBAL_SEARCH_FIELDS.includes("device.imei"));
    assert.ok(GLOBAL_SEARCH_FIELDS.includes("vehicle.vehicle_number"));
    assert.ok(GLOBAL_SEARCH_FIELDS.includes("hardware.pmm_type"));
    assert.ok(GLOBAL_SEARCH_FIELDS.includes("storage.ssd_type"));
  });
});

describe("cross-field OR filter combination", () => {
  it("Case 1: multi values inside SSD Issue are OR within the field", () => {
    const expr = describeOrFilterExpression({
      ssdIssue: ["A", "B"],
    });
    assert.equal(expr, "(ssdIssue=A OR ssdIssue=B)");
    const clauses = buildOrFilterClauses({ ssdIssue: ["A", "B"] });
    assert.equal(clauses.length, 1);
    assert.deepEqual(clauses[0], { kind: "text", key: "ssdIssue", values: ["A", "B"] });
  });

  it("Case 2: SSD Issue A and PMM Issue B combine with OR across fields", () => {
    const clauses = buildOrFilterClauses({
      ssdIssue: "A",
      pmmIssue: "B",
    });
    assert.equal(clauses.length, 2);
    assert.deepEqual(
      new Set(clauses.map((c) => (c.kind === "text" ? `${c.key}=${c.values.join("|")}` : ""))),
      new Set(["ssdIssue=A", "pmmIssue=B"]),
    );
    assert.match(describeOrFilterExpression({ ssdIssue: "A", pmmIssue: "B" }), /ssdIssue=A/);
    assert.match(describeOrFilterExpression({ ssdIssue: "A", pmmIssue: "B" }), /pmmIssue=B/);
    assert.match(describeOrFilterExpression({ ssdIssue: "A", pmmIssue: "B" }), / OR /);
  });

  it("Case 3: Vehicle + SSD + PMM are all OR'd (not AND)", () => {
    const expr = describeOrFilterExpression({
      ssdIssue: "A",
      pmmIssue: "B",
      vehicleNumber: "123",
    });
    assert.match(expr, /ssdIssue=A/);
    assert.match(expr, /pmmIssue=B/);
    assert.match(expr, /vehicleNumber=123/);
    assert.equal(expr.split(" OR ").length, 3);
    const clauses = buildOrFilterClauses({
      ssdIssue: "A",
      pmmIssue: "B",
      vehicleNumber: "123",
    });
    assert.equal(clauses.length, 3);
  });

  it("Case 4: unrelated filters Status / Vehicle / IMEI combine with OR", () => {
    const expr = describeOrFilterExpression({
      status: "open",
      vehicleNumber: "123",
      deviceImei: "456",
    });
    assert.match(expr, /status=open/);
    assert.match(expr, /vehicleNumber=123/);
    assert.match(expr, /deviceImei=456/);
    assert.equal(expr.split(" OR ").length, 3);
  });

  it("Case 5: clearing filters resets state, URL params, and OR clauses", () => {
    const dirty = {
      ...defaultFilterState(),
      status: "open",
      ssdIssue: ["SSD Failure"],
      pmmIssue: ["PMM Failure"],
      vehicleNumber: ["123"],
    };
    assert.ok(countActiveFilters(dirty) > 0);
    assert.ok(buildOrFilterClauses(toIssueQueryFilters(dirty)).length > 0);

    const cleared = defaultFilterState();
    assert.equal(countActiveFilters(cleared), 0);
    assert.deepEqual(buildOrFilterClauses(toIssueQueryFilters(cleared)), []);
    assert.equal(describeOrFilterExpression(toIssueQueryFilters(cleared)), "(no active filters)");

    const params = mergeFiltersIntoParams(
      new URLSearchParams("status=open&ssdIssue=SSD+Failure&view=compact"),
      cleared,
    );
    assert.equal(params.get("status"), null);
    assert.equal(params.get("ssdIssue"), null);
    assert.equal(params.get("view"), "compact");
    assert.deepEqual(parseFiltersFromParams(params), defaultFilterState());
  });

  it("omits empty filters so they do not create AND restrictions", () => {
    const clauses = buildOrFilterClauses({
      ssdIssue: "A",
      pmmIssue: "",
      motherboardIssue: [],
      status: "   ",
    });
    assert.deepEqual(clauses, [{ kind: "text", key: "ssdIssue", values: ["A"] }]);
  });
});

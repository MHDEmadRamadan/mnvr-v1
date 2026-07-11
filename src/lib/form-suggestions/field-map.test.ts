import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { COMBOBOX_FORM_FIELDS } from "@/config/maintenance-form-config";
import {
  ALL_FORM_SUGGESTION_FIELDS,
  FORM_SUGGESTION_FIELD_SOURCES,
} from "@/lib/form-suggestions/field-map";

describe("form suggestion field map", () => {
  it("does not reference removed issues.issue_source column", () => {
    assert.ok(!("issue_source" in FORM_SUGGESTION_FIELD_SOURCES));
    assert.ok(!ALL_FORM_SUGGESTION_FIELDS.includes("issue_source" as never));

    for (const [field, source] of Object.entries(FORM_SUGGESTION_FIELD_SOURCES)) {
      assert.notEqual(
        field,
        "issue_source",
        "issue_source must not be a whitelisted suggestion field",
      );
      assert.notEqual(
        source.column,
        "issue_source",
        `field ${field} must not query issues.issue_source`,
      );
      if (source.table === "issues") {
        assert.notEqual(
          source.column,
          "issue_source",
          "issues table suggestions must not use issue_source",
        );
      }
    }
  });

  it("maintenance combobox fields only use whitelisted suggestion columns", () => {
    for (const field of COMBOBOX_FORM_FIELDS) {
      if (!field.suggestionField) continue;
      assert.ok(
        field.suggestionField in FORM_SUGGESTION_FIELD_SOURCES,
        `unknown suggestionField on ${field.key}: ${field.suggestionField}`,
      );
      assert.notEqual(
        field.suggestionField,
        "issue_source",
        `combobox ${field.key} must not use issue_source`,
      );
    }
  });
});

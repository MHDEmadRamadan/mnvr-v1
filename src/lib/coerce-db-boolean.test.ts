import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { coerceDbBoolean } from "./coerce-db-boolean";

describe("coerceDbBoolean — real boolean columns", () => {
  const cases: [unknown, boolean][] = [
    [true, true],
    [false, false],
    ["true", true],
    ["false", false],
    [1, true],
    [0, false],
    ["1", true],
    [null, false],
    [undefined, false],
    ["", false],
    ["Yes", false],
    ["No", false],
    ["maybe", false],
  ];

  for (const [input, expected] of cases) {
    it(`${JSON.stringify(input)} → ${expected}`, () => {
      assert.equal(coerceDbBoolean(input), expected);
    });
  }
});

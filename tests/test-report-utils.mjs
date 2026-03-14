import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-report-utils.mjs");

import { summarizeSeries } from "../src/app/runtime/reportUtils.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const withInvalid = summarizeSeries([1, "2", NaN, "abc", undefined, Infinity, -Infinity]);
assert(withInvalid.frames === 7, "frames should count original entries");
assert(withInvalid.min === 0, "invalid values should be normalized to 0 for min");
assert(withInvalid.max === 2, "max should ignore invalid values normalized to 0");
assert(Math.abs(withInvalid.avg - (3 / 7)) < 1e-12, "avg should remain finite when invalid numbers are present");


const withThrowingInput = summarizeSeries([1, Symbol("boom"), { valueOf() { throw new Error("nope"); } }]);
assert(withThrowingInput.frames === 3, "frames should include uncoercible inputs");
assert(withThrowingInput.min === 0, "uncoercible values should normalize to 0 for min");
assert(withThrowingInput.max === 1, "valid finite values should still influence max");
assert(Math.abs(withThrowingInput.avg - (1 / 3)) < 1e-12, "uncoercible values should contribute as 0 to avg");


const withPrimitiveVariants = summarizeSeries([true, false, 5n, "3"]);
assert(withPrimitiveVariants.frames === 4, "primitive variant frames mismatch");
assert(withPrimitiveVariants.min === 0, "primitive variant min mismatch");
assert(withPrimitiveVariants.max === 5, "primitive variant max mismatch");
assert(Math.abs(withPrimitiveVariants.avg - (9 / 4)) < 1e-12, "primitive variant avg mismatch");

const empty = summarizeSeries([]);
assert(empty.avg === 0 && empty.min === 0 && empty.max === 0 && empty.frames === 0, "empty series should return zeroed summary");

console.log("REPORT_UTILS_OK summarizeSeries handles invalid numeric input deterministically");

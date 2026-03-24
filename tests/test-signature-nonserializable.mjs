import assert from "node:assert/strict";

import { stableStringify } from "../src/kernel/store/signature.js";

assert.throws(
  () => stableStringify({ evil: () => "boom" }),
  /non-serializable value at path: value\.evil/,
  "stableStringify must reject function-valued state material",
);

const cycle = {};
cycle.self = cycle;
assert.throws(
  () => stableStringify(cycle),
  /circular reference at path: value\.self/,
  "stableStringify must reject circular structures",
);

console.log("SIGNATURE_NONSERIALIZABLE_OK function+cycle rejected");

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-placebo-test-guard.mjs");
import fs from "node:fs";
import path from "node:path";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const root = path.resolve(".");

const deterministicTests = [
  "tests/test-determinism-per-tick.mjs",
  "tests/test-determinism-long.mjs",
  "tests/test-divergence.mjs",
  "tests/test-determinism-with-interactions.mjs",
];

for (const rel of deterministicTests) {
  const abs = path.join(root, rel);
  const text = fs.readFileSync(abs, "utf8");

  const assertCount = (text.match(/\bassert\s*\(/g) || []).length;
  assert(assertCount >= 2, `${rel} must contain explicit assert-based checks (found ${assertCount})`);

  assert(!/\blet\s+pass\s*=/.test(text), `${rel} still uses pass-counter style placebo pattern`);
  assert(
    /negative .*divergence/i.test(text) || /different seeds should/i.test(text) || /should diverge/i.test(text),
    `${rel} must enforce at least one explicit negative divergence expectation`,
  );
}

console.log("PLACEBO_TEST_GUARD_OK determinism suite enforces assert + negative divergence checks");

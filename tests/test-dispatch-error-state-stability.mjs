import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const failingDispatchCases = [
  { label: "gen-world-extra-payload", action: { type: "GEN_WORLD", payload: { gameMode: "lab_autorun" } }, expectedMessage: "is not allowed" },
  { label: "sim-step-force", action: { type: "SIM_STEP", payload: { force: true } }, expectedMessage: "is not allowed" },
  { label: "unknown-action", action: { type: "RUN_BENCHMARK", payload: {} }, expectedMessage: "Unknown action type: RUN_BENCHMARK" },
];

const store = createDeterministicStore({ seed: "p0-error-stability" });
store.dispatch({ type: "GEN_WORLD", payload: {} });

const anchors = [];
for (const testCase of failingDispatchCases) {
  const before = snapshotStore(store);
  let threw = false;
  let message = "";
  try {
    store.dispatch(testCase.action);
  } catch (error) {
    threw = true;
    message = String(error?.message || error);
  }
  assert(threw, `${testCase.label} must throw`);
  assert(message.includes(testCase.expectedMessage), `${testCase.label} must include '${testCase.expectedMessage}', got '${message}'`);
  const after = snapshotStore(store);
  assert.equal(after.revisionCount, before.revisionCount, `${testCase.label} must keep revisionCount stable`);
  assert.equal(after.signature, before.signature, `${testCase.label} must keep signature stable`);
  assert.equal(after.signatureMaterialHash, before.signatureMaterialHash, `${testCase.label} must keep signature material stable`);
  assert.equal(after.readModelHash, before.readModelHash, `${testCase.label} must keep read model stable`);
  anchors.push(`${testCase.label}:${after.signature}:${after.signatureMaterialHash}:${after.readModelHash}`);
}

console.log(`DISPATCH_ERROR_STATE_STABILITY_OK anchors=${anchors.join(",")}`);

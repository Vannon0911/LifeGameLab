import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";
import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

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

const mutatingReducerStore = createStore(
  manifest,
  {
    reducer: (state, action, ctx) => {
      state.meta.seed = "MUTATED_BY_REDUCER";
      return reducer(state, action, ctx);
    },
    simStep: simStepPatch,
  },
  { storageDriver: createNullDriver() },
);

const mutatingReducerBefore = snapshotStore(mutatingReducerStore);
assert.throws(
  () => mutatingReducerStore.dispatch({ type: "SET_SEED", payload: "p0-mutation-guard" }),
  /Reducer mutated input state/,
  "mutating reducer must be blocked",
);
const mutatingReducerAfter = snapshotStore(mutatingReducerStore);
assert.equal(mutatingReducerAfter.signature, mutatingReducerBefore.signature, "mutating reducer must not change state signature");
assert.equal(
  mutatingReducerAfter.signatureMaterialHash,
  mutatingReducerBefore.signatureMaterialHash,
  "mutating reducer must not change signature material",
);

const mutatingSimStore = createStore(
  manifest,
  {
    reducer,
    simStep: (state) => {
      state.meta.seed = "MUTATED_BY_SIM";
      return [];
    },
  },
  { storageDriver: createNullDriver() },
);
mutatingSimStore.dispatch({ type: "GEN_WORLD", payload: {} });
const mutatingSimBefore = snapshotStore(mutatingSimStore);
assert.throws(
  () => mutatingSimStore.dispatch({ type: "SIM_STEP", payload: {} }),
  /simStep mutated input state/,
  "mutating simStep must be blocked",
);
const mutatingSimAfter = snapshotStore(mutatingSimStore);
assert.equal(mutatingSimAfter.signature, mutatingSimBefore.signature, "mutating simStep must not change state signature");
assert.equal(
  mutatingSimAfter.signatureMaterialHash,
  mutatingSimBefore.signatureMaterialHash,
  "mutating simStep must not change signature material",
);

console.log("INPUT_MUTATION_GUARD_OK reducer=blocked simStep=blocked");

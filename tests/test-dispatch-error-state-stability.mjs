import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";
import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import { manifest } from "../src/game/manifest.js";
import { manifest as contractManifest } from "../src/game/contracts/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";

const failingDispatchCases = [
  { label: "gen-world-extra-payload", action: { type: "GEN_WORLD", payload: { gameMode: "lab_autorun" } }, expectedMessage: "is not allowed" },
  { label: "sim-step-force", action: { type: "SIM_STEP", payload: { force: true } }, expectedMessage: "is not allowed" },
  { label: "place-building-zone-legacy-payload", action: { type: "PLACE_BUILDING", payload: { x: 2, y: 2, radius: 2, zoneType: 1 } }, expectedMessage: "is not allowed" },
  { label: "queue-worker-legacy-harvest-payload", action: { type: "QUEUE_WORKER", payload: { x: 2, y: 2 } }, expectedMessage: "is not allowed" },
  { label: "queue-worker-scaffolded-fail-closed", action: { type: "QUEUE_WORKER", payload: { coreId: "core-1", count: 1 } }, expectedMessage: "not implemented" },
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
  () => mutatingReducerStore.dispatch({ type: "SET_SEED", payload: { seed: "p0-mutation-guard" } }),
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

let savedDocSeen = null;
const mutatingDriverStore = createStore(
  manifest,
  { reducer, simStep: simStepPatch },
  {
    storageDriver: {
      load: () => null,
      save: (doc) => {
        savedDocSeen = doc;
        doc.state.meta.seed = "MUTATED_BY_DRIVER";
      },
    },
  },
);
mutatingDriverStore.dispatch({ type: "SET_SEED", payload: { seed: "p0-driver-copy" } });
const stateAfterDriverSave = mutatingDriverStore.getState();
assert.equal(stateAfterDriverSave.meta.seed, "p0-driver-copy", "driver-side mutation must not taint committed store state");
assert.equal(savedDocSeen.state.meta.seed, "MUTATED_BY_DRIVER", "counterprobe must verify mutation happened on persisted copy");

console.log("DRIVER_COPY_ISOLATION_OK mutation-contained=true");

const failingSaveStore = createStore(
  manifest,
  { reducer, simStep: simStepPatch },
  {
    storageDriver: {
      load: () => null,
      save: () => {
        throw new Error("disk-full");
      },
    },
  },
);
const failingSaveBefore = snapshotStore(failingSaveStore);
assert.throws(
  () => failingSaveStore.dispatch({ type: "SET_SEED", payload: { seed: "p0-save-fail" } }),
  /disk-full/,
  "save failures must surface to caller",
);
const failingSaveAfter = snapshotStore(failingSaveStore);
assert.equal(failingSaveAfter.signature, failingSaveBefore.signature, "save failures must not commit signature");
assert.equal(
  failingSaveAfter.signatureMaterialHash,
  failingSaveBefore.signatureMaterialHash,
  "save failures must not commit attestation material",
);
assert.equal(failingSaveAfter.revisionCount, failingSaveBefore.revisionCount, "save failures must not commit revisionCount");

console.log("SAVE_FAILURE_ATOMICITY_OK commit-blocked=true");

const refLeakManifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: {
        type: "object",
        shape: {
          seed: { type: "string", default: "seed" },
          tag: { type: "object", allowUnknown: true, default: {} },
        },
      },
    },
  },
  actionSchema: {
    SET_TAG: {
      type: "object",
      shape: {},
    },
  },
  mutationMatrix: {
    SET_TAG: ["/meta/tag"],
  },
};
const leakedRef = { nested: { value: 1 } };
const refLeakStore = createStore(
  refLeakManifest,
  {
    reducer: () => [
      { op: "set", path: "/meta/tag", value: leakedRef },
    ],
  },
  { storageDriver: createNullDriver() },
);
refLeakStore.dispatch({ type: "SET_TAG", payload: {} });
leakedRef.nested.value = 999;
assert.equal(
  refLeakStore.getState().meta.tag.nested.value,
  1,
  "patch value references must be copied before commit",
);

console.log("PATCH_VALUE_REF_ISOLATION_OK leak-blocked=true");

assert.throws(
  () => createStore(contractManifest, { reducer, simStep: simStepPatch }, { storageDriver: createNullDriver() }),
  /domainPatchGate/,
  "contract manifest must not be accepted as runtime store manifest",
);

console.log("RUNTIME_MANIFEST_AUTHORITY_OK contract-manifest boot is fail-closed");

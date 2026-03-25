import assert from "node:assert/strict";

import { createStore } from "../src/kernel/store/createStore.js";
import { replayActions } from "../src/kernel/store/replay.js";
import {
  createDeterministicStore,
  getPlayerStartWindowSquare,
  snapshotStore,
  sha256Text,
} from "./support/liveTestKit.mjs";

function buildReplayActions(seed) {
  const prep = createDeterministicStore({ seed });
  prep.dispatch({ type: "GEN_WORLD", payload: {} });
  const founderTiles = getPlayerStartWindowSquare(prep.getState(), 1);
  const placeFounderActions = founderTiles.map((tile) => ({
    type: "PLACE_WORKER",
    payload: { x: tile.x, y: tile.y, remove: false },
  }));

  return {
    founderTiles,
    actions: [
      { type: "SET_SEED", payload: { seed } },
      { type: "GEN_WORLD", payload: {} },
      ...placeFounderActions,
      { type: "SET_UI", payload: { runPhase: "run_active" } },
      { type: "TOGGLE_RUNNING", payload: { running: true } },
      { type: "SIM_STEP", payload: {} },
      { type: "SIM_STEP", payload: {} },
      { type: "SIM_STEP", payload: {} },
      { type: "SIM_STEP", payload: {} },
    ],
  };
}

function runReplayTruth(actions) {
  const store = createDeterministicStore();
  const signatures = replayActions(store, actions);
  const snap = snapshotStore(store);
  const signatureChainHash = sha256Text(signatures.join("|"));
  return {
    signatures,
    signatureChainHash,
    finalSignature: snap.signature,
    finalSignatureMaterialHash: snap.signatureMaterialHash,
    finalReadModelHash: snap.readModelHash,
  };
}

const mainSeed = "p0-seed-main";
const altSeed = "p0-seed-alt";

const mainPlan = buildReplayActions(mainSeed);
const altPlan = buildReplayActions(altSeed);

assert.equal(mainPlan.actions.length, altPlan.actions.length, "replay plans must stay comparable");
assert.deepEqual(mainPlan.founderTiles, altPlan.founderTiles, "founder placement path must stay deterministic");

const replayA = runReplayTruth(mainPlan.actions);
const replayB = runReplayTruth(mainPlan.actions);
const replayAlt = runReplayTruth(altPlan.actions);

assert.deepEqual(replayA.signatures, replayB.signatures, "same-seed replay signature sequence drifted");
assert.equal(replayA.signatureChainHash, replayB.signatureChainHash, "same-seed replay chain hash drifted");
assert.equal(replayA.finalSignature, replayB.finalSignature, "same-seed final signature drifted");
assert.equal(replayA.finalSignatureMaterialHash, replayB.finalSignatureMaterialHash, "same-seed final signature material drifted");
assert.equal(replayA.finalReadModelHash, replayB.finalReadModelHash, "same-seed final read model drifted");

assert.notEqual(replayA.signatureChainHash, replayAlt.signatureChainHash, "cross-seed replay chain hash must diverge");
assert.notEqual(replayA.finalSignatureMaterialHash, replayAlt.finalSignatureMaterialHash, "cross-seed final signature material must diverge");
assert.notEqual(replayA.finalReadModelHash, replayAlt.finalReadModelHash, "cross-seed final read model must diverge");

const baseState = createDeterministicStore().getState();
const attestationManifest = {
  SCHEMA_VERSION: 1,
  stateSchema: {
    type: "object",
    shape: {
      meta: {
        type: "object",
        shape: {
          seed: { type: "string", default: "seed" },
        },
      },
      roll: { type: "number", default: 0 },
    },
  },
  actionSchema: {
    STEP: { type: "object", shape: {} },
  },
  mutationMatrix: {
    STEP: ["/roll"],
  },
};
const attestationProject = {
  reducer: (_state, _action, ctx) => [{ op: "set", path: "/roll", value: ctx.rng.world.u32() }],
};
const revisionZeroStore = createStore(attestationManifest, attestationProject, {
  storageDriver: {
    load: () => ({
      schemaVersion: 1,
      updatedAt: 0,
      revisionCount: 0,
      state: { meta: { seed: String(baseState.meta.seed) }, roll: 0 },
    }),
    save: () => {},
  },
});
const revisionOneStore = createStore(attestationManifest, attestationProject, {
  storageDriver: {
    load: () => ({
      schemaVersion: 1,
      updatedAt: 1,
      revisionCount: 1,
      state: { meta: { seed: String(baseState.meta.seed) }, roll: 0 },
    }),
    save: () => {},
  },
});
assert.notEqual(
  revisionZeroStore.getSignature(),
  revisionOneStore.getSignature(),
  "revisionCount must be part of attestation signature",
);
assert.notEqual(
  revisionZeroStore.getSignatureMaterial(),
  revisionOneStore.getSignatureMaterial(),
  "revisionCount must be part of signature material",
);
revisionZeroStore.dispatch({ type: "STEP", payload: {} });
revisionOneStore.dispatch({ type: "STEP", payload: {} });
assert.notEqual(
  revisionZeroStore.getState().roll,
  revisionOneStore.getState().roll,
  "revision-separated RNG scopes must stay distinguishable in attestation tests",
);

console.log(
  `KERNEL_REPLAY_TRUTH_OK same-seed=${replayA.signatureChainHash} final=${replayA.finalSignature}:${replayA.finalSignatureMaterialHash}:${replayA.finalReadModelHash} cross-seed=${replayAlt.signatureChainHash}:${replayAlt.finalSignatureMaterialHash}:${replayAlt.finalReadModelHash}`,
);

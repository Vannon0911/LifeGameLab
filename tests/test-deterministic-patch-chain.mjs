import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import { manifest } from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";
import { stableStringify } from "../src/kernel/store/signature.js";

function sha256Text(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

function createInstrumentedStore(seed, patchLog) {
  return createStore(
    manifest,
    {
      reducer: (state, action, ctx) => {
        const patches = reducer(state, action, ctx);
        patchLog.push({ phase: "reducer", actionType: action?.type || "", patches: stableStringify(patches || []) });
        return patches;
      },
      simStep: (state, action, ctx) => {
        const patches = simStepPatch(state, action, ctx);
        patchLog.push({ phase: "simStep", actionType: action?.type || "", patches: stableStringify(patches || []) });
        return patches;
      },
    },
    { storageDriver: createNullDriver() },
  );
}

function runScenario(store, seed) {
  store.dispatch({ type: "SET_SEED", payload: { seed } });
  store.dispatch({ type: "GEN_WORLD", payload: {} });

  const stateAfterGen = store.getState();
  const preset = getWorldPreset(stateAfterGen.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, stateAfterGen.world.w, stateAfterGen.world.h);
  const workerX = range.x0;
  const workerY = range.y0;

  store.dispatch({ type: "PLACE_WORKER", payload: { x: workerX, y: workerY, remove: false } });
  store.dispatch({ type: "SET_UI", payload: { runPhase: "run_active" } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  for (let i = 0; i < 6; i += 1) {
    store.dispatch({ type: "SIM_STEP", payload: {} });
  }

  const signatureMaterial = store.getSignatureMaterial();
  return {
    signature: store.getSignature(),
    signatureMaterialHash: sha256Text(signatureMaterial),
  };
}

const seed = "deterministic-patch-chain-seed";
const patchLogA = [];
const patchLogB = [];

const storeA = createInstrumentedStore(seed, patchLogA);
const storeB = createInstrumentedStore(seed, patchLogB);

const endA = runScenario(storeA, seed);
const endB = runScenario(storeB, seed);

assert.deepEqual(patchLogA, patchLogB, "same seed + same action flow must emit identical reducer/simStep patch sequence");
assert.equal(endA.signature, endB.signature, "same seed + same action flow must preserve final signature");
assert.equal(
  endA.signatureMaterialHash,
  endB.signatureMaterialHash,
  "same seed + same action flow must preserve signature material hash",
);

console.log(`DETERMINISTIC_PATCH_CHAIN_OK events=${patchLogA.length} signature=${endA.signature} material=${endA.signatureMaterialHash}`);

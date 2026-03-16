import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-buffered-step.mjs");
import { createStore } from "../src/core/kernel/store.js";
import { createRngStreamsScoped } from "../src/core/kernel/rng.js";
import { applyPatches } from "../src/core/kernel/patches.js";
import { sanitizeBySchema } from "../src/core/kernel/schema.js";
import * as manifestMod from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import crypto from "node:crypto";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function stateDigest(state) {
  const json = JSON.stringify(state, (_key, value) => {
    if (ArrayBuffer.isView(value)) return Array.from(value);
    return value;
  });
  return sha256Hex(json);
}

function runNormal(seed) {
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  return sha256Hex(store.getSignatureMaterial());
}

function projectSimStep(seed) {
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const doc = store.getDoc();
  const rev = doc.revisionCount | 0;
  const state = store.getState();
  const clean = { type: "SIM_STEP", payload: sanitizeBySchema({ force: true }, manifestMod.actionSchema.SIM_STEP) };
  const rng = createRngStreamsScoped(seed, `simStep:SIM_STEP:${rev}`);
  const patches = simStepPatch(state, clean, { rng });
  if (!Array.isArray(patches) || patches.length === 0) throw new Error("expected simStepPatch patches");
  const projected = applyPatches(state, patches);
  return { digest: stateDigest(projected), patches };
}

const seed = "buffered-step-1";
const sig1 = runNormal(seed);
const projected = projectSimStep(seed);

const normalStore = createStore(manifestMod, { reducer, simStep: simStepPatch });
normalStore.dispatch({ type: "SET_SEED", payload: seed });
normalStore.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
normalStore.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
normalStore.dispatch({ type: "SIM_STEP", payload: { force: true } });
const normalDigest = stateDigest(normalStore.getState());
assert(normalDigest === projected.digest, `projected simStep state mismatch\nnormal=${normalDigest}\nprojected=${projected.digest}`);
assert(Array.isArray(projected.patches) && projected.patches.length > 0, "simStepPatch must produce mutation patches");

console.log("BUFFERED_STEP_OK signatures match");

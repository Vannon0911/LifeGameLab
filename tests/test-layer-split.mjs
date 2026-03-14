import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-layer-split.mjs");
import * as manifest from "../src/project/project.manifest.js";
import { makeInitialState, reducer, simStepPatch } from "../src/project/project.logic.js";
import { applyPatches } from "../src/core/kernel/patches.js";
import { sanitizeBySchema } from "../src/core/kernel/schema.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Minimal wiring proof:
// 1) Reducer must not mutate on SIM_STEP (core split).
// 2) simStepPatch must produce patches for SIM_STEP when running/forced.
let state = sanitizeBySchema(makeInitialState(), manifest.stateSchema);
state = applyPatches(state, reducer(state, { type: "SET_SEED", payload: "layer-split-1" }, { rng: {} }));
state = sanitizeBySchema(state, manifest.stateSchema);
state = applyPatches(state, reducer(state, { type: "GEN_WORLD", payload: {} }, { rng: {} }));
state = sanitizeBySchema(state, manifest.stateSchema);
state = applyPatches(state, reducer(state, { type: "TOGGLE_RUNNING", payload: { running: true } }, { rng: {} }));
state = sanitizeBySchema(state, manifest.stateSchema);

const reducerPatches = reducer(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
assert(Array.isArray(reducerPatches) && reducerPatches.length === 0, "SIM_STEP reducer must return [] (no mutation in reducer phase)");

const simPatches = simStepPatch(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
assert(Array.isArray(simPatches) && simPatches.length > 0, "simStepPatch must return patches (mutation in simStep phase)");

console.log("LAYER_SPLIT_OK reducer:0 patches, simStep:>0 patches");

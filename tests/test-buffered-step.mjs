import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-buffered-step.mjs");
import { createStore } from "../src/core/kernel/store.js";
import { createRngStreamsScoped } from "../src/core/kernel/rng.js";
import { applyPatches } from "../src/core/kernel/patches.js";
import { sanitizeBySchema } from "../src/core/kernel/schema.js";
import * as manifestMod from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import crypto from "node:crypto";

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function runNormal(seed) {
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  return sha256Hex(store.getSignatureMaterial());
}

function runBuffered(seed) {
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const doc = store.getDoc();
  const rev = doc.revisionCount | 0;
  const state = store.getState();
  const clean = { type: "SIM_STEP", payload: sanitizeBySchema({ force: true }, manifestMod.actionSchema.SIM_STEP) };
  const rng = createRngStreamsScoped(seed, `simStep:SIM_STEP:${rev}`);
  const patches = simStepPatch(state, clean, { rng });
  if (!Array.isArray(patches) || patches.length === 0) throw new Error("expected simStepPatch patches");

  // Apply via manifest action (kernel gates + sim gate in reducer).
  store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches } });
  return sha256Hex(store.getSignatureMaterial());
}

const seed = "buffered-step-1";
const sig1 = runNormal(seed);
const sig2 = runBuffered(seed);
if (sig1 !== sig2) {
  throw new Error(`BUFFERED_STEP_FAIL signature mismatch\nnormal=${sig1}\nbuffered=${sig2}`);
}
console.log("BUFFERED_STEP_OK signatures match");

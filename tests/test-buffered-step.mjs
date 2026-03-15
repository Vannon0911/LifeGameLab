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

function runNormal(seed) {
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  return sha256Hex(store.getSignatureMaterial());
}

function runBuffered(seed) {
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const doc = store.getDoc();
  const rev = doc.revisionCount | 0;
  const tick = Number(store.getState().sim.tick || 0);
  const state = store.getState();
  const clean = { type: "SIM_STEP", payload: sanitizeBySchema({ force: true }, manifestMod.actionSchema.SIM_STEP) };
  const rng = createRngStreamsScoped(seed, `simStep:SIM_STEP:${rev}`);
  const patches = simStepPatch(state, clean, { rng });
  if (!Array.isArray(patches) || patches.length === 0) throw new Error("expected simStepPatch patches");

  // Apply via manifest action (kernel gates + sim gate in reducer).
  store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches, baseRevision: rev, baseSimTick: tick } });
  return { sig: sha256Hex(store.getSignatureMaterial()), rev, tick, patches };
}

const seed = "buffered-step-1";
const sig1 = runNormal(seed);
const buffered = runBuffered(seed);
const sig2 = buffered.sig;
if (sig1 !== sig2) {
  throw new Error(`BUFFERED_STEP_FAIL signature mismatch\nnormal=${sig1}\nbuffered=${sig2}`);
}

{
  const store = createStore(manifestMod, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const before = store.getSignature();
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: { patches: buffered.patches, baseRevision: buffered.rev + 1, baseSimTick: buffered.tick },
  });
  const afterWrongRevision = store.getSignature();
  assert(afterWrongRevision === before, "buffered apply with mismatched baseRevision must be a no-op");

  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: { patches: buffered.patches, baseRevision: buffered.rev, baseSimTick: buffered.tick + 1 },
  });
  const afterWrongTick = store.getSignature();
  assert(afterWrongTick === before, "buffered apply with mismatched baseSimTick must be a no-op");
}

console.log("BUFFERED_STEP_OK signatures match");

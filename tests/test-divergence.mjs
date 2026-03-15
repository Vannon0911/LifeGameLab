import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-divergence.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import crypto from "node:crypto";

const SEEDS = ["div-1", "div-2"];
const TICKS = 40;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function getTrace(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  
  const results = [];
  for (let t = 0; t < TICKS; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    const s = store.getState();
    // Full-state signature is the strongest determinism proof in this kernel.
    results.push({ aliveCount: s.sim.aliveCount, sig: sha256Hex(store.getSignatureMaterial()) });
  }
  return results;
}

function sameTrace(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].aliveCount !== b[i].aliveCount) return false;
    if (a[i].sig !== b[i].sig) return false;
  }
  return true;
}

for (const seed of SEEDS) {
  const left = getTrace(seed);
  const right = getTrace(seed);
  assert(sameTrace(left, right), `[divergence] deterministic replay failed for seed=${seed}`);
  console.log(`[divergence] ${seed}: deterministic replay OK`);
}

const traceA = getTrace(SEEDS[0]);
const traceB = getTrace(SEEDS[1]);
assert(!sameTrace(traceA, traceB), "[divergence] different seeds should diverge");

console.log(`Divergence results: ${SEEDS.length}/${SEEDS.length} deterministic + cross-seed divergence OK`);

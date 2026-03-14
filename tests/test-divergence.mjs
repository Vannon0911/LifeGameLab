import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-divergence.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import crypto from "node:crypto";

const SEEDS = ["div-1", "div-2"];
const TICKS = 40;

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

let pass = 0;
for (const seed of SEEDS) {
  const r1 = getTrace(seed);
  const r2 = getTrace(seed);
  
  let match = true;
  for (let i = 0; i < r1.length; i++) {
    if (r1[i].aliveCount !== r2[i].aliveCount) { match = false; break; }
    if (r1[i].sig !== r2[i].sig) { match = false; break; }
  }
  
  if (match) {
    console.log(`[divergence] ${seed}: OK (deterministic)`);
    pass++;
  } else {
    console.error(`[divergence] ${seed}: FAIL (non-deterministic!)`);
  }
}

console.log(`Divergence results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

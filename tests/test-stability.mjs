import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-stability.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

const SEEDS = ["stable-1", "stable-2"];
const TICKS = 200;

function runStability(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  
  let aliveSeen = false;
  for (let t = 0; t < TICKS; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    const s = store.getState();
    if (s.sim.aliveCount > 0) aliveSeen = true;
  }
  
  if (!aliveSeen) throw new Error(`${seed}: no cells ever lived`);
  const final = store.getState().sim.aliveCount;
  if (final === 0) console.warn(`[stability] ${seed} went extinct (expected in harsh profiles)`);
}

let pass = 0;
for (const seed of SEEDS) {
  try {
    runStability(seed);
    pass++;
  } catch (err) {
    console.error(`Stability failed for ${seed}:`, err.message);
  }
}

console.log(`Stability results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

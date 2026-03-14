import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-invariants.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

const SEEDS = ["inv-1", "inv-2"];
const TICKS = 50;

function checkInvariants(state, label) {
  const { world, sim } = state;
  const N = world.w * world.h;
  
  // Invariant: No energy/reserve on empty tiles
  for (let i = 0; i < N; i++) {
    if (world.alive[i] === 0) {
      if ((world.E[i] || 0) > 1e-6) throw new Error(`${label}: energy on dead tile at ${i}`);
      if ((world.link[i] || 0) > 1e-6) throw new Error(`${label}: link on dead tile at ${i}`);
    }
  }
  
  // Invariant: Plant cap enforcement
  const plantRatio = sim.plantTileRatio || 0;
  if (plantRatio > 0.16) throw new Error(`${label}: plant cap exceeded (${plantRatio})`);
}

let pass = 0;
for (const seed of SEEDS) {
  try {
// Run the same reducer/simStep wiring as the browser runtime (src/app/main.js).
    const store = createStore(manifest, { reducer, simStep: simStepPatch });
    store.dispatch({ type: "SET_SEED", payload: seed });
    store.dispatch({ type: "GEN_WORLD" });
    store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
    
    for (let t = 0; t < TICKS; t++) {
      store.dispatch({ type: "SIM_STEP", payload: { force: true } });
      checkInvariants(store.getState(), `${seed} T${t}`);
    }
    pass++;
  } catch (err) {
    console.error(`Invariant test failed for ${seed}:`, err.message);
  }
}

console.log(`Invariant results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

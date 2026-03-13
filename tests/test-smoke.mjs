import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

const SEEDS = ["smoke-a", "smoke-b", "smoke-c", "smoke-d"];
const TICKS = 100;

function runSeed(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  for (let t = 0; t < TICKS; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }
  return store.getState();
}

function assertFinite(sim, label) {
  const keys = [
    "aliveRatio",
    "meanLAlive",
    "meanEnergyAlive",
    "meanNutrientField",
    "meanToxinField",
    "meanSaturationField",
    "meanPlantField",
    "clusterRatio",
    "networkRatio",
  ];
  for (const k of keys) {
    const v = Number(sim[k]);
    if (!Number.isFinite(v)) throw new Error(`${label}: non-finite metric ${k}`);
  }
}

let pass = 0;
for (const seed of SEEDS) {
  try {
    const state = runSeed(seed);
    assertFinite(state.sim, seed);
    // Non-placebo: these values must be produced by sim.js aggregation, not just default zeros.
    if (!(Number(state.sim.aliveRatio) > 0)) throw new Error(`${seed}: aliveRatio not computed`);
    if (!(Number(state.sim.meanPlantField) > 0)) throw new Error(`${seed}: meanPlantField not computed`);
    if (!(Number(state.sim.meanNutrientField) > 0)) throw new Error(`${seed}: meanNutrientField not computed`);
    // Plant cap enforcement in 08.03. logic
    if (Number(state.sim.plantTileRatio || 0) > 0.16) throw new Error(`${seed}: plant tile cap exceeded ${state.sim.plantTileRatio}`);
    pass++;
  } catch (err) {
    console.error(`Seed ${seed} failed:`, err.message);
  }
}

console.log(`Smoke test results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

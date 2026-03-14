import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-smoke.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

const SEEDS = ["smoke-a", "smoke-b", "smoke-c", "smoke-d"];
const TICKS = 100;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runSeed(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  for (let t = 0; t < TICKS; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }
  return { state: store.getState(), signature: store.getSignature() };
}

function assertFiniteMetrics(sim, label) {
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

function assertRatioBounds(sim, label, key) {
  const v = Number(sim[key]);
  assert(Number.isFinite(v), `${label}: ${key} must be finite`);
  assert(v >= 0 && v <= 1, `${label}: ${key} out of bounds [0..1], got ${v}`);
}

function assertSeedInvariants(result, label) {
  const sim = result.state.sim;
  assertFiniteMetrics(sim, label);
  assertRatioBounds(sim, label, "aliveRatio");
  assertRatioBounds(sim, label, "clusterRatio");
  assertRatioBounds(sim, label, "networkRatio");
  assert(Number(sim.meanPlantField) > 0, `${label}: meanPlantField must be > 0 (aggregation missing)`);
  assert(Number(sim.meanNutrientField) > 0, `${label}: meanNutrientField must be > 0 (aggregation missing)`);
  assert(Number(sim.aliveRatio) > 0, `${label}: aliveRatio must be > 0 (aggregation missing)`);
  assert(Number(sim.plantTileRatio || 0) <= 0.16, `${label}: plantTileRatio cap exceeded (${sim.plantTileRatio})`);
}

function metricSnapshot(state) {
  const sim = state.sim || {};
  return {
    aliveRatio: Number(sim.aliveRatio || 0),
    meanPlantField: Number(sim.meanPlantField || 0),
    meanNutrientField: Number(sim.meanNutrientField || 0),
    meanToxinField: Number(sim.meanToxinField || 0),
    clusterRatio: Number(sim.clusterRatio || 0),
    networkRatio: Number(sim.networkRatio || 0),
    playerDNA: Number(sim.playerDNA || 0),
    tick: Number(sim.tick || 0),
  };
}

for (const seed of SEEDS) {
  const runA = runSeed(seed);
  const runB = runSeed(seed);
  assertSeedInvariants(runA, `${seed}/runA`);
  assertSeedInvariants(runB, `${seed}/runB`);

  const snapA = metricSnapshot(runA.state);
  const snapB = metricSnapshot(runB.state);
  assert(runA.signature === runB.signature, `${seed}: signature drift between identical runs`);
  assert(
    JSON.stringify(snapA) === JSON.stringify(snapB),
    `${seed}: metric snapshot drift between identical runs (${JSON.stringify({ snapA, snapB })})`,
  );
}

console.log(`SMOKE_OK seeds=${SEEDS.length} ticks=${TICKS} deterministic metrics/signatures verified`);

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-smoke.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

const SEEDS = ["smoke-a", "smoke-b", "smoke-c", "smoke-d"];
const TICKS = 100;
const CHECKPOINTS = [25, 50, 75, 100];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function snapshotState(state) {
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

function runSeed(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  const checkpoints = new Map();
  for (let t = 0; t < TICKS; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    const tick = t + 1;
    if (CHECKPOINTS.includes(tick)) {
      const stateAtTick = store.getState();
      checkpoints.set(tick, {
        signature: store.getSignature(),
        snapshot: snapshotState(stateAtTick),
      });
    }
  }
  return { state: store.getState(), signature: store.getSignature(), checkpoints };
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

function assertNonNegative(sim, label, key) {
  const v = Number(sim[key]);
  assert(Number.isFinite(v), `${label}: ${key} must be finite`);
  assert(v >= 0, `${label}: ${key} must be >= 0, got ${v}`);
}

function assertSeedInvariants(result, label) {
  const sim = result.state.sim;
  assertFiniteMetrics(sim, label);
  assertRatioBounds(sim, label, "aliveRatio");
  assertRatioBounds(sim, label, "networkRatio");
  assertNonNegative(sim, label, "clusterRatio");
  assert(Number(sim.meanPlantField) > 0, `${label}: meanPlantField must be > 0 (aggregation missing)`);
  assert(Number(sim.meanNutrientField) > 0, `${label}: meanNutrientField must be > 0 (aggregation missing)`);
  assert(Number(sim.aliveRatio) > 0, `${label}: aliveRatio must be > 0 (aggregation missing)`);
  assert(Number(sim.plantTileRatio || 0) <= 0.16, `${label}: plantTileRatio cap exceeded (${sim.plantTileRatio})`);
}

for (const seed of SEEDS) {
  const runA = runSeed(seed);
  const runB = runSeed(seed);
  assertSeedInvariants(runA, `${seed}/runA`);
  assertSeedInvariants(runB, `${seed}/runB`);

  const finalSnapA = snapshotState(runA.state);
  const finalSnapB = snapshotState(runB.state);
  assert(runA.signature === runB.signature, `${seed}: final signature drift between identical runs`);
  assert(
    JSON.stringify(finalSnapA) === JSON.stringify(finalSnapB),
    `${seed}: final metric drift between identical runs (${JSON.stringify({ finalSnapA, finalSnapB })})`,
  );

  for (const tick of CHECKPOINTS) {
    const cpA = runA.checkpoints.get(tick);
    const cpB = runB.checkpoints.get(tick);
    assert(cpA, `${seed}: missing checkpoint runA@${tick}`);
    assert(cpB, `${seed}: missing checkpoint runB@${tick}`);
    assert(cpA.signature === cpB.signature, `${seed}: checkpoint signature drift at tick=${tick}`);
    assert(
      JSON.stringify(cpA.snapshot) === JSON.stringify(cpB.snapshot),
      `${seed}: checkpoint metric drift at tick=${tick} (${JSON.stringify({ cpA: cpA.snapshot, cpB: cpB.snapshot })})`,
    );
  }
}

console.log(`SMOKE_OK seeds=${SEEDS.length} ticks=${TICKS} checkpoints=${CHECKPOINTS.join(",")} deterministic metrics/signatures verified`);

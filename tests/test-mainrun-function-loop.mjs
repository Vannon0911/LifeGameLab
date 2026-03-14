import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-mainrun-function-loop.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function runScenario({ seed, presetId, actionType, warmupTicks }) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId } });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  for (let i = 0; i < warmupTicks; i++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }
  const before = store.getState().sim;
  store.dispatch({ type: actionType });
  const after = store.getState().sim;

  return {
    dna: Number(after.playerDNA || 0) - Number(before.playerDNA || 0),
    harvest: Number(after.harvestYieldTotal || 0) - Number(before.harvestYieldTotal || 0),
    prune: Number(after.pruneYieldTotal || 0) - Number(before.pruneYieldTotal || 0),
    recycle: Number(after.recycleYieldTotal || 0) - Number(before.recycleYieldTotal || 0),
    seed: Number(after.seedYieldTotal || 0) - Number(before.seedYieldTotal || 0),
  };
}

const presets = ["river_delta", "dry_basin", "wet_meadow"];
const actions = ["SEED_SPREAD", "HARVEST_PULSE", "PRUNE_CLUSTER", "RECYCLE_PATCH"];

const totals = Object.create(null);
for (const action of actions) {
  totals[action] = { count: 0, dna: 0, harvest: 0, prune: 0, recycle: 0, seed: 0 };
}

for (let i = 0; i < 10; i++) {
  const presetId = presets[i % presets.length];
  const actionType = actions[i % actions.length];
  const warmupTicks = 40 + (i % 3) * 10;
  const delta = runScenario({
    seed: `mainrun-loop-${i}-${presetId}`,
    presetId,
    actionType,
    warmupTicks,
  });
  const bucket = totals[actionType];
  bucket.count += 1;
  bucket.dna += delta.dna;
  bucket.harvest += delta.harvest;
  bucket.prune += delta.prune;
  bucket.recycle += delta.recycle;
  bucket.seed += delta.seed;
}

function avg(action, key) {
  const bucket = totals[action];
  return bucket[key] / Math.max(1, bucket.count);
}

assert(avg("SEED_SPREAD", "seed") > 15, "SEED_SPREAD under target: average seedYield too low");
assert(avg("HARVEST_PULSE", "harvest") > 9, "HARVEST_PULSE under target: average harvestYield too low");
assert(avg("HARVEST_PULSE", "dna") > 2.5, "HARVEST_PULSE under target: average DNA gain too low");
assert(avg("PRUNE_CLUSTER", "prune") > 1.2, "PRUNE_CLUSTER under target: average pruneYield too low");
assert(avg("PRUNE_CLUSTER", "dna") > 0.2, "PRUNE_CLUSTER under target: average DNA gain too low");
assert(avg("RECYCLE_PATCH", "recycle") > 4, "RECYCLE_PATCH under target: average recycleYield too low");
assert(avg("RECYCLE_PATCH", "dna") > 0.5, "RECYCLE_PATCH under target: average DNA gain too low");

console.log(`MAINRUN_FUNCTION_LOOP_OK ${JSON.stringify(totals)}`);

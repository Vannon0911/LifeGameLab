import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-freeze-contract.mjs");
import { manifest } from "../src/project/project.manifest.js";
import { GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const requiredActions = [
  "CONFIRM_FOUNDATION",
  "SET_WORLD_PRESET",
  "HARVEST_PULSE",
  "PRUNE_CLUSTER",
  "RECYCLE_PATCH",
  "SEED_SPREAD",
];

for (const type of requiredActions) {
  assert(manifest.actionSchema[type], `${type} missing from actionSchema`);
  assert(manifest.mutationMatrix[type], `${type} missing from mutationMatrix`);
  assert(manifest.dataflow.actions[type], `${type} missing from dataflow`);
}

const simKeys = new Set(manifest.simGate?.sim?.keys || []);
for (const key of [
  "runPhase",
  "founderBudget",
  "founderPlaced",
  "meanWaterField",
  "stageProgressScore",
  "harvestYieldTotal",
  "pruneYieldTotal",
  "recycleYieldTotal",
  "seedYieldTotal",
  "stabilityScore",
  "ecologyScore",
]) {
  assert(simKeys.has(key), `${key} missing from simGate`);
}

const worldKeys = manifest.simGate?.world?.keys || {};
assert(worldKeys.water?.ctor === "Float32Array", "world.water missing or wrong type");
assert(worldKeys.biomeId?.ctor === "Int8Array", "world.biomeId missing or wrong type");
assert(worldKeys.founderMask?.ctor === "Uint8Array", "world.founderMask missing or wrong type");
assert(worldKeys.visibility?.ctor === "Uint8Array", "world.visibility missing or wrong type");
assert(worldKeys.explored?.ctor === "Uint8Array", "world.explored missing or wrong type");

assert(manifest.stateSchema?.shape?.meta?.shape?.gameMode?.default === GAME_MODE.GENESIS, "meta.gameMode default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.runPhase?.default === RUN_PHASE.GENESIS_SETUP, "sim.runPhase default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.founderBudget?.default === 4, "sim.founderBudget default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.founderPlaced?.default === 0, "sim.founderPlaced default drift");

console.log("FREEZE_CONTRACT_OK phase-a contract surface is bound");

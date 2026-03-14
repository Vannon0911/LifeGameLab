import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-freeze-contract.mjs");
import { manifest } from "../src/project/project.manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const requiredActions = [
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

console.log("FREEZE_CONTRACT_OK required actions and world fields are contract-bound");

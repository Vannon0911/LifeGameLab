import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-freeze-contract.mjs");
import { manifest } from "../src/project/project.manifest.js";
import { WORLD_PRESET_IDS, getWorldPreset } from "../src/game/sim/worldPresets.js";
import { GAME_MODE, RUN_PHASE, ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(RUN_PHASE.GENESIS_ZONE === "genesis_zone", "RUN_PHASE.GENESIS_ZONE missing or drifted");
assert(RUN_PHASE.DNA_ZONE_SETUP === "dna_zone_setup", "RUN_PHASE.DNA_ZONE_SETUP missing or drifted");
assert(ZONE_ROLE && typeof ZONE_ROLE === "object" && Object.keys(ZONE_ROLE).length > 0, "ZONE_ROLE missing or empty");

const requiredActions = [
  "CONFIRM_FOUNDATION",
  "CONFIRM_CORE_ZONE",
  "START_DNA_ZONE_SETUP",
  "TOGGLE_DNA_ZONE_CELL",
  "CONFIRM_DNA_ZONE",
  "BEGIN_INFRA_BUILD",
  "BUILD_INFRA_PATH",
  "CONFIRM_INFRA_PATH",
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
  "unlockedZoneTier",
  "nextZoneUnlockKind",
  "nextZoneUnlockCostEnergy",
  "zoneUnlockProgress",
  "coreEnergyStableTicks",
  "zone2Unlocked",
  "zone2PlacementBudget",
  "dnaZoneCommitted",
  "nextInfraUnlockCostDNA",
  "infrastructureUnlocked",
  "infraBuildMode",
  "infraBuildCostEnergy",
  "infraBuildCostDNA",
  "cpuBootstrapDone",
  "patternCatalog",
  "patternBonuses",
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
assert(worldKeys.coreZoneMask?.ctor === "Uint8Array", "world.coreZoneMask missing or wrong type");
assert(worldKeys.dnaZoneMask?.ctor === "Uint8Array", "world.dnaZoneMask missing or wrong type");
assert(worldKeys.infraCandidateMask?.ctor === "Uint8Array", "world.infraCandidateMask missing or wrong type");
assert(worldKeys.visibility?.ctor === "Uint8Array", "world.visibility missing or wrong type");
assert(worldKeys.explored?.ctor === "Uint8Array", "world.explored missing or wrong type");
assert(worldKeys.zoneRole?.ctor === "Uint8Array", "world.zoneRole missing or wrong type");
assert(worldKeys.zoneId?.ctor === "Int32Array", "world.zoneId missing or wrong type");
assert(worldKeys.zoneMeta?.type === "object", "world.zoneMeta missing or wrong type");

assert(manifest.stateSchema?.shape?.meta?.shape?.gameMode?.default === GAME_MODE.GENESIS, "meta.gameMode default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.runPhase?.default === RUN_PHASE.GENESIS_SETUP, "sim.runPhase default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.founderBudget?.default === 4, "sim.founderBudget default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.founderPlaced?.default === 0, "sim.founderPlaced default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.unlockedZoneTier?.default === 0, "sim.unlockedZoneTier default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.nextZoneUnlockKind?.default === "", "sim.nextZoneUnlockKind default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.nextZoneUnlockCostEnergy?.default === 0, "sim.nextZoneUnlockCostEnergy default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.zoneUnlockProgress?.default === 0, "sim.zoneUnlockProgress default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.coreEnergyStableTicks?.default === 0, "sim.coreEnergyStableTicks default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.zone2Unlocked?.default === false, "sim.zone2Unlocked default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.zone2PlacementBudget?.default === 0, "sim.zone2PlacementBudget default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.dnaZoneCommitted?.default === false, "sim.dnaZoneCommitted default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.nextInfraUnlockCostDNA?.default === 0, "sim.nextInfraUnlockCostDNA default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.infrastructureUnlocked?.default === false, "sim.infrastructureUnlocked default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.infraBuildMode?.default === "", "sim.infraBuildMode default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.infraBuildCostEnergy?.default === 0, "sim.infraBuildCostEnergy default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.infraBuildCostDNA?.default === 0, "sim.infraBuildCostDNA default drift");
assert(manifest.stateSchema?.shape?.sim?.shape?.cpuBootstrapDone?.default === 0, "sim.cpuBootstrapDone default drift");
assert(typeof manifest.stateSchema?.shape?.sim?.shape?.patternCatalog?.default === "object", "sim.patternCatalog default missing");
assert(typeof manifest.stateSchema?.shape?.sim?.shape?.patternBonuses?.default === "object", "sim.patternBonuses default missing");

for (const presetId of WORLD_PRESET_IDS) {
  const preset = getWorldPreset(presetId);
  assert(Number(preset?.phaseD?.infraBuildCostEnergy || 0) > 0, `${presetId} phaseD.infraBuildCostEnergy missing`);
  assert(Number(preset?.phaseD?.infraBuildCostDNA || 0) > 0, `${presetId} phaseD.infraBuildCostDNA missing`);
  assert(Number(preset?.phaseD?.visionRadiusCore || 0) >= 1, `${presetId} phaseD.visionRadiusCore missing`);
  assert(Number(preset?.phaseD?.visionRadiusDNA || 0) >= 1, `${presetId} phaseD.visionRadiusDNA missing`);
  assert(Number(preset?.phaseD?.visionRadiusInfra || 0) >= 1, `${presetId} phaseD.visionRadiusInfra missing`);
}

console.log("FREEZE_CONTRACT_OK phase-a contract surface is bound");

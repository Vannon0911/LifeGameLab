import { PHYSICS_DEFAULT } from "../../../core/kernel/physics.js";

export const WORLD_KEYS = [
  "w", "h",
  "nextLineageId",
  "alive", "E", "L", "R", "W", "water",
  "Sat", "baseSat",
  "P", "B", "plantKind",
  "reserve", "link",
  "superId", "clusterField",
  "hue", "lineageId", "trait", "age", "biomeId",
  "born", "died",
  "actionMap",
  "balanceGovernor",
  "lastFounderTick",
  "globalLearning",
  "devMutationVault",
  "lineageMemory",
  "lineageThreatMemory",
  "lineageDefenseReadiness",
  "clusterAttackState",
  "zoneMap",
  "coreZoneMask",
  "dnaZoneMask",
  "infraCandidateMask",
  "zoneRole",
  "zoneId",
  "zoneMeta",
  "founderMask",
  "visibility",
  "explored",
];

export const WORLD_SIM_STEP_KEYS = WORLD_KEYS.filter(
  (k) => k !== "baseSat" && k !== "water" && k !== "biomeId" && k !== "zoneMap" && k !== "coreZoneMask" && k !== "dnaZoneMask" && k !== "infraCandidateMask" && k !== "zoneRole" && k !== "zoneId" && k !== "zoneMeta" && k !== "superId" && k !== "actionMap" && k !== "founderMask" && k !== "visibility" && k !== "explored"
);

export const SIM_KEYS = [
  "tick", "running", "runPhase", "founderBudget", "founderPlaced", "unlockedZoneTier", "nextZoneUnlockKind", "nextZoneUnlockCostEnergy", "zoneUnlockProgress", "coreEnergyStableTicks", "zone2Unlocked", "zone2PlacementBudget", "dnaZoneCommitted", "nextInfraUnlockCostDNA", "infrastructureUnlocked", "infraBuildMode", "infraBuildCostEnergy", "infraBuildCostDNA", "cpuBootstrapDone",
  "aliveCount", "aliveRatio",
  "meanLAlive", "meanEnergyAlive", "meanReserveAlive",
  "meanNutrientField", "meanToxinField", "meanSaturationField", "meanPlantField", "meanBiochargeField",
  "meanWaterField",
  "plantTileRatio", "dominantHueRatio",
  "lineageDiversity",
  "evolutionStageMean", "evolutionStageMax",
  "networkRatio", "clusterRatio",
  "birthsLastStep", "deathsLastStep", "mutationsLastStep",
  "raidEventsLastStep", "infectionsLastStep", "conflictKillsLastStep", "superCellsLastStep",
  "remoteAttacksLastStep", "remoteAttackKillsLastStep", "defenseActivationsLastStep", "resourceStolenLastStep",
  "plantsPrunedLastStep", "cellPatternCounts", "nutrientCappedTilesLastStep", "energyClearedTilesLastStep",
  "expansionCount", "lastExpandTick", "expansionWork", "nextExpandCost",
  "playerAliveCount", "cpuAliveCount",
  "playerEnergyIn", "playerEnergyOut", "playerEnergyNet", "playerEnergyStored",
  "lightShare", "nutrientShare", "seasonPhase",
  "playerDNA", "totalHarvested", "playerStage",
  "stageProgressScore", "harvestYieldTotal", "pruneYieldTotal", "recycleYieldTotal", "seedYieldTotal",
  "stabilityScore", "ecologyScore", "activeBiomeCount", "patternCatalog", "patternBonuses",
  "energySupremacyTicks", "efficiencyTicks", "lossStreakTicks", "stockpileTicks",
  "cpuEnergyIn", "gameResult", "winMode", "gameEndTick", "runSummary", "goal",
];

export const UI_KEYS = new Set([
  "panelOpen",
  "activeTab",
  "expertMode",
  "showBiochargeOverlay",
  "showRemoteAttackOverlay",
  "showDefenseOverlay",
  "offscreenEnabled",
  "ariaLevel",
]);

export const PHYSICS_KEYS = new Set(Object.keys(PHYSICS_DEFAULT || {}));

export function pushKeysPatches(patches, obj, keys, prefix, prevObj = null) {
  const src = obj && typeof obj === "object" ? obj : {};
  const prev = prevObj && typeof prevObj === "object" ? prevObj : null;
  for (const k of keys) {
    if (src[k] === undefined) continue;
    if (prev && Object.is(prev[k], src[k])) continue;
    patches.push({ op: "set", path: `${prefix}/${k}`, value: src[k] });
  }
}

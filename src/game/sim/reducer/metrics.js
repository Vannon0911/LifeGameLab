import { PHYSICS_DEFAULT } from "../../../core/kernel/physics.js";

export const WORLD_KEYS = [
  "w", "h",
  "nextLineageId",
  "alive", "E", "L", "R", "W",
  "Sat", "baseSat",
  "P", "B", "plantKind",
  "reserve", "link",
  "superId", "clusterField",
  "hue", "lineageId", "trait", "age",
  "born", "died",
  "actionMap",
  "balanceGovernor",
  "lastFounderTick",
  "worldAiAudit",
  "globalLearning",
  "devMutationVault",
  "devAiLast",
  "lineageMemory",
  "lineageThreatMemory",
  "lineageDefenseReadiness",
  "clusterAttackState",
  "zoneMap",
];

export const WORLD_SIM_STEP_KEYS = WORLD_KEYS.filter(
  (k) => k !== "baseSat" && k !== "zoneMap" && k !== "superId" && k !== "actionMap" && k !== "born" && k !== "died"
);

export const SIM_KEYS = [
  "tick", "running",
  "aliveCount", "aliveRatio",
  "meanLAlive", "meanEnergyAlive", "meanReserveAlive",
  "meanNutrientField", "meanToxinField", "meanSaturationField", "meanPlantField", "meanBiochargeField",
  "plantTileRatio", "dominantHueRatio",
  "lineageDiversity",
  "evolutionStageMean", "evolutionStageMax",
  "networkRatio", "clusterRatio",
  "birthsLastStep", "deathsLastStep", "mutationsLastStep",
  "raidEventsLastStep", "infectionsLastStep", "conflictKillsLastStep", "superCellsLastStep",
  "remoteAttacksLastStep", "remoteAttackKillsLastStep", "defenseActivationsLastStep", "resourceStolenLastStep",
  "plantsPrunedLastStep", "nutrientCappedTilesLastStep", "energyClearedTilesLastStep",
  "expansionCount", "lastExpandTick", "expansionWork", "nextExpandCost",
  "playerAliveCount", "cpuAliveCount",
  "playerEnergyIn", "playerEnergyOut", "playerEnergyNet", "playerEnergyStored",
  "lightShare", "nutrientShare", "seasonPhase",
  "playerDNA", "totalHarvested", "playerStage",
  "energySupremacyTicks", "efficiencyTicks", "lossStreakTicks", "stockpileTicks",
  "cpuEnergyIn", "gameResult", "winMode", "gameEndTick", "goal",
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

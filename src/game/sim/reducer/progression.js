import { GOAL_CODE, deriveRiskCode, RISK_CODE } from "../../contracts/ids.js";
import { BIOME_IDS } from "../worldPresets.js";
import { defaultLineageMemory } from "../shared.js";

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function getPlayerBiomeUsageBucket(world, playerLineageId) {
  if (!world.lineageMemory || typeof world.lineageMemory !== "object") return {};
  const mem = world.lineageMemory[playerLineageId];
  if (!mem || typeof mem !== "object") return {};
  const ticks = mem.biomeUsageTicks;
  if (!ticks || typeof ticks !== "object") return {};
  const out = {};
  for (const k of Object.keys(ticks)) {
    const v = Number(ticks[k]);
    if (Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function updateBiomeUsage(world, meta, simLike) {
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  const biomeId = world?.biomeId;
  const playerLineageId = Number(meta?.playerLineageId || 0) | 0;
  if (!alive || !lineageId || !biomeId || !playerLineageId) return { activeBiomes: 0, shares: {}, patches: [] };

  const counts = {
    [BIOME_IDS.barren_flats]: 0,
    [BIOME_IDS.riverlands]: 0,
    [BIOME_IDS.wet_forest]: 0,
    [BIOME_IDS.dry_plains]: 0,
    [BIOME_IDS.toxic_marsh]: 0,
  };
  let playerAliveCount = 0;
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== playerLineageId) continue;
    playerAliveCount++;
    const id = Number(biomeId[i]) | 0;
    if (Object.prototype.hasOwnProperty.call(counts, id)) counts[id]++;
  }

  const usage = getPlayerBiomeUsageBucket(world, playerLineageId);
  const shares = {};
  let activeBiomes = 0;
  let usageChanged = false;
  for (const key of Object.keys(counts)) {
    const id = Number(key) | 0;
    const share = playerAliveCount > 0 ? counts[id] / playerAliveCount : 0;
    shares[id] = share;
    if (share >= 0.10) {
      const prev = Number(usage[id] || 0);
      usage[id] = prev + 1;
      usageChanged = true;
    }
    if (Number(usage[id] || 0) >= 50) activeBiomes++;
  }

  const patches = [];
  if (usageChanged) {
    const currentMem = world.lineageMemory?.[playerLineageId] || defaultLineageMemory();
    patches.push({
      op: "set",
      path: `/world/lineageMemory/${playerLineageId}`,
      value: { ...currentMem, biomeUsageTicks: usage }
    });
  }

  return { activeBiomes, shares, patches };
}

export function deriveStageState(world, simLike, meta) {
  const playerDNA = Math.max(0, Number(simLike?.playerDNA || 0));
  const harvestYieldTotal = Math.max(0, Number(simLike?.harvestYieldTotal || 0));
  const pruneYieldTotal = Math.max(0, Number(simLike?.pruneYieldTotal || 0));
  const recycleYieldTotal = Math.max(0, Number(simLike?.recycleYieldTotal || 0));
  const seedYieldTotal = Math.max(0, Number(simLike?.seedYieldTotal || 0));
  const totalYield = harvestYieldTotal + pruneYieldTotal + recycleYieldTotal + seedYieldTotal;
  const playerAliveCount = Math.max(0, Number(simLike?.playerAliveCount || 0));
  const clusterRatio = clamp01(Number(simLike?.clusterRatio || 0));
  const playerEnergyNet = Number(simLike?.playerEnergyNet || 0);
  const lineageDiversity = Math.max(0, Number(simLike?.lineageDiversity || 0));
  const meanWaterField = clamp01(Number(simLike?.meanWaterField || 0));
  const plantTileRatio = clamp01(Number(simLike?.plantTileRatio || 0));

  const { activeBiomes, patches } = updateBiomeUsage(world, meta, simLike);

  const dnaScore = clamp01(Number.isFinite(playerDNA) ? playerDNA / 70 : 0);
  const yieldScore = clamp01(Number.isFinite(totalYield) ? totalYield / 56 : 0);
  const stabilityScore = clamp01(
    (Number.isFinite(playerAliveCount) ? playerAliveCount / 18 : 0) * 0.34 +
    (Number.isFinite(clusterRatio) ? clusterRatio / 0.20 : 0) * 0.28 +
    clamp01(Number.isFinite(playerEnergyNet) ? (playerEnergyNet + 2) / 8 : 0) * 0.18 +
    (Number.isFinite(lineageDiversity) ? lineageDiversity / 8 : 0) * 0.20
  );
  const ecologyScore = clamp01(
    (Number.isFinite(meanWaterField) ? meanWaterField / 0.25 : 0) * 0.35 +
    (Number.isFinite(plantTileRatio) ? plantTileRatio / 0.24 : 0) * 0.25 +
    (Number.isFinite(activeBiomes) ? activeBiomes / 2 : 0) * 0.20 +
    clamp01(1 - Number(simLike?.meanToxinField || 0)) * 0.20
  );

  const stageProgressScore =
    (Number.isFinite(dnaScore) ? dnaScore : 0) * 0.30 +
    (Number.isFinite(yieldScore) ? yieldScore : 0) * 0.25 +
    (Number.isFinite(stabilityScore) ? stabilityScore : 0) * 0.25 +
    (Number.isFinite(ecologyScore) ? ecologyScore : 0) * 0.20;

  const yieldCategories =
    (harvestYieldTotal > 0 ? 1 : 0) +
    (pruneYieldTotal > 0 ? 1 : 0) +
    (recycleYieldTotal > 0 ? 1 : 0) +
    (seedYieldTotal > 0 ? 1 : 0);

  const signals60 =
    dnaScore >= 0.60 &&
    yieldScore >= 0.60 &&
    stabilityScore >= 0.60 &&
    ecologyScore >= 0.60;

  const risk = deriveRiskCode({
    ...simLike,
    playerAliveCount,
    meanWaterField,
  });
  const patternCatalog = simLike?.patternCatalog || {};
  const patternBonuses = simLike?.patternBonuses || {};
  let patternClassCount = 0;
  for (const key of Object.keys(patternCatalog)) {
    if (Number(patternCatalog[key]?.count || 0) > 0) patternClassCount++;
  }
  const hasPositivePatternBonus = Object.keys(patternBonuses).some((key) => Number(patternBonuses[key] || 0) > 0);

  const gates = {
    2: playerAliveCount >= 8 && playerEnergyNet > 0,
    3: yieldCategories >= 2 && meanWaterField >= 0.10 && simLike?.dnaZoneCommitted === true,
    4: clusterRatio >= 0.12 && activeBiomes >= 2 && simLike?.infrastructureUnlocked === true,
    5: signals60
      && risk !== RISK_CODE.COLLAPSE
      && risk !== RISK_CODE.CRITICAL
      && patternClassCount > 0
      && hasPositivePatternBonus,
  };
  const thresholds = {
    2: 0.22,
    3: 0.44,
    4: 0.68,
    5: 0.86,
  };

  let nextStage = Math.max(1, Number(simLike?.playerStage || 1));
  for (const stage of [2, 3, 4, 5]) {
    if (stageProgressScore + 1e-9 >= thresholds[stage] && gates[stage]) nextStage = Math.max(nextStage, stage);
  }

  return {
    meanWaterField,
    stabilityScore,
    ecologyScore,
    stageProgressScore,
    playerStage: nextStage,
    activeBiomeCount: activeBiomes,
  };
}

export function deriveGoalCodeWithPresetBias(simLike, meta, fallbackGoalCode) {
  const presetId = String(meta?.worldPresetId || "river_delta");
  const networkRatio = Number(simLike?.networkRatio || 0);
  const playerEnergyNet = Number(simLike?.playerEnergyNet || 0);
  const patternCatalog = simLike?.patternCatalog || {};
  const patternBonuses = simLike?.patternBonuses || {};
  let patternClassCount = 0;
  for (const key of Object.keys(patternCatalog)) {
    if (Number(patternCatalog[key]?.count || 0) > 0) patternClassCount++;
  }
  const hasPositivePatternBonus = Object.keys(patternBonuses).some((key) => Number(patternBonuses[key] || 0) > 0);

  if (presetId === "river_delta" && simLike?.infrastructureUnlocked && networkRatio >= 0.10 && playerEnergyNet > 0) {
    return GOAL_CODE.EXPANSION;
  }
  if (presetId === "dry_basin") {
    if (playerEnergyNet < 2) return GOAL_CODE.SURVIVE_ENERGY;
    return GOAL_CODE.HARVEST_SECURE;
  }
  if (presetId === "wet_meadow") {
    if (patternClassCount > 0 && hasPositivePatternBonus && Number(simLike?.playerDNA || 0) >= Math.max(5, Number(simLike?.playerStage || 1) * 5)) {
      return GOAL_CODE.EVOLUTION_READY;
    }
    return GOAL_CODE.GROWTH;
  }
  return fallbackGoalCode;
}

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-f-progression-integrity.mjs");

import { BIOME_IDS } from "../src/game/sim/worldPresets.js";
import { deriveStageState } from "../src/game/sim/reducer/progression.js";
import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";
import { handleBuyEvolution } from "../src/game/sim/playerActions.js";
import { DEV_MUTATION_CATALOG } from "../src/game/sim/reducer/techTreeOps.js";
import { GAME_RESULT, GOAL_CODE, WIN_MODE, deriveGoalCode } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function findPatch(patches, path) {
  return Array.isArray(patches) ? patches.find((entry) => String(entry?.path || "") === path) : null;
}

function makeProgressWorld() {
  const biomeId = new Uint8Array([
    BIOME_IDS.riverlands,
    BIOME_IDS.riverlands,
    BIOME_IDS.riverlands,
    BIOME_IDS.riverlands,
    BIOME_IDS.wet_forest,
    BIOME_IDS.wet_forest,
    BIOME_IDS.wet_forest,
    BIOME_IDS.wet_forest,
    BIOME_IDS.dry_plains,
    BIOME_IDS.dry_plains,
    BIOME_IDS.dry_plains,
    BIOME_IDS.dry_plains,
  ]);
  return {
    alive: new Uint8Array(biomeId.length).fill(1),
    lineageId: new Uint32Array(biomeId.length).fill(1),
    biomeId,
    lineageMemory: {
      1: {
        biomeUsageTicks: {
          [BIOME_IDS.riverlands]: 80,
          [BIOME_IDS.wet_forest]: 80,
        },
      },
    },
  };
}

function makeProgressSim(patch = {}) {
  return {
    playerStage: 2,
    playerDNA: 70,
    harvestYieldTotal: 26,
    pruneYieldTotal: 14,
    recycleYieldTotal: 10,
    seedYieldTotal: 8,
    totalHarvested: 999,
    playerAliveCount: 18,
    clusterRatio: 0.34,
    playerEnergyNet: 3.2,
    lineageDiversity: 8,
    networkRatio: 0.30,
    meanWaterField: 0.24,
    plantTileRatio: 0.24,
    meanToxinField: 0.02,
    playerEnergyStored: 5,
    ...patch,
  };
}

function makeCanonicalLossState() {
  return {
    meta: { playerLineageId: 1 },
    world: {
      alive: new Uint8Array([0, 0, 0]),
      lineageId: new Uint32Array([0, 0, 0]),
      visibility: new Uint8Array([1, 0, 0]),
      zoneRole: ["core", "dna", "infra"],
      zoneId: ["core_a", "dna_a", "infra_a"],
      zoneMeta: {
        core_a: { role: "core", committed: true, playerLineageId: 1 },
        dna_a: { role: "dna", committed: false, playerLineageId: 1 },
        infra_a: { role: "infra", committed: false, playerLineageId: 1 },
      },
    },
    sim: {
      gameResult: GAME_RESULT.NONE,
      winMode: WIN_MODE.SUPREMACY,
      networkRatio: 0.20,
      energySupremacyTicks: 0,
      stockpileTicks: 0,
      efficiencyTicks: 0,
      lossStreakTicks: 0,
      cpuEnergyIn: 0,
    },
  };
}

function makeEvolutionState({
  techs,
  playerStage = 2,
  playerDNA = 20,
  infrastructureUnlocked = false,
  patternCatalog = [],
  patternBonuses = {},
  networkRatio = 0.12,
} = {}) {
  const size = 4;
  return {
    meta: { playerLineageId: 1, gridW: 2, gridH: 2 },
    sim: {
      playerStage,
      playerDNA,
      playerAliveCount: 12,
      clusterRatio: 0.22,
      infrastructureUnlocked,
      patternCatalog,
      patternBonuses,
      networkRatio,
      expansionCount: 0,
      expansionWork: 0,
      nextExpandCost: 100,
      defenseActivationsLastStep: 0,
    },
    world: {
      w: 2,
      h: 2,
      alive: new Uint8Array(size).fill(1),
      lineageId: new Uint32Array(size).fill(1),
      trait: new Float32Array(size * 7),
      hue: new Float32Array(size),
      lineageMemory: {
        1: {
          techs: [...techs],
          synergies: [],
          splitUnlock: 0,
        },
      },
    },
  };
}

{
  const world = makeProgressWorld();
  const telemetryOnly = deriveStageState(
    world,
    makeProgressSim({
      dnaZoneCommitted: false,
      infrastructureUnlocked: false,
    }),
    { playerLineageId: 1 }
  );
  assert(telemetryOnly.playerStage === 2, `old telemetry alone must not cross stage gates, got ${telemetryOnly.playerStage}`);

  const stage3 = deriveStageState(
    makeProgressWorld(),
    makeProgressSim({
      playerStage: 2,
      dnaZoneCommitted: true,
      infrastructureUnlocked: false,
    }),
    { playerLineageId: 1 }
  );
  const stage4 = deriveStageState(
    makeProgressWorld(),
    makeProgressSim({
      playerStage: stage3.playerStage,
      dnaZoneCommitted: true,
      infrastructureUnlocked: true,
    }),
    { playerLineageId: 1 }
  );
  const stage5 = deriveStageState(
    makeProgressWorld(),
    makeProgressSim({
      playerStage: stage4.playerStage,
      dnaZoneCommitted: true,
      infrastructureUnlocked: true,
      patternCatalog: [{ id: "line", discovered: true }],
      patternBonuses: { stability: 0.25 },
    }),
    { playerLineageId: 1 }
  );
  assert(stage3.playerStage >= 3, `dna-zone gate should unlock stage 3, got ${stage3.playerStage}`);
  assert(stage4.playerStage >= stage3.playerStage && stage4.playerStage >= 4, `infrastructure gate should unlock stage 4, got ${stage4.playerStage}`);
  assert(stage5.playerStage >= stage4.playerStage && stage5.playerStage >= 5, `pattern gate should unlock stage 5, got ${stage5.playerStage}`);
}

{
  const riverA = deriveGoalCode({ tick: 30, playerAliveCount: 16, playerEnergyNet: 1.5, infrastructureUnlocked: true, networkRatio: 0.22 }, 30, "river_delta");
  const riverB = deriveGoalCode({ tick: 30, playerAliveCount: 16, playerEnergyNet: 1.5, infrastructureUnlocked: true, networkRatio: 0.22 }, 30, "river_delta");
  const dryA = deriveGoalCode({ tick: 30, playerAliveCount: 12, playerEnergyNet: -1.2, playerEnergyStored: 0.8 }, 30, "dry_basin");
  const wetA = deriveGoalCode({ tick: 30, playerAliveCount: 10, playerDNA: 4, playerEnergyNet: 1 }, 30, "wet_meadow");
  assert(riverA === GOAL_CODE.EXPANSION && riverA === riverB, `river preset drift: ${riverA} vs ${riverB}`);
  assert(dryA === GOAL_CODE.SURVIVE_ENERGY, `dry preset drift: ${dryA}`);
  assert(wetA === GOAL_CODE.GROWTH, `wet preset drift: ${wetA}`);
}

{
  const stateA = makeCanonicalLossState();
  const stateB = makeCanonicalLossState();
  const simOutA = {
    playerAliveCount: 4,
    playerEnergyNet: 1,
    playerEnergyIn: 6,
    cpuAliveCount: 1,
    cpuEnergyIn: 1,
  };
  const simOutB = {
    playerAliveCount: 4,
    playerEnergyNet: 1,
    playerEnergyIn: 6,
    cpuAliveCount: 1,
    cpuEnergyIn: 1,
  };
  applyWinConditions(stateA, simOutA, 60);
  applyWinConditions(stateB, simOutB, 60);
  assert(simOutA.gameResult === GAME_RESULT.LOSS, "canonical loss must resolve to loss");
  assert(simOutA.winMode === WIN_MODE.CORE_COLLAPSE, `canonical loss drift: ${simOutA.winMode}`);
  assert(simOutA.winMode === simOutB.winMode, "canonical loss must be deterministic");
}

{
  const blockedReserve = handleBuyEvolution(
    makeEvolutionState({
      techs: ["nutrient_harvest"],
      infrastructureUnlocked: false,
    }),
    { type: "BUY_EVOLUTION", payload: { archetypeId: "reserve_buffer" } },
    DEV_MUTATION_CATALOG
  );
  assert(Array.isArray(blockedReserve) && blockedReserve.length === 0, "reserve_buffer must stay blocked without infrastructure");

  const openReserveA = handleBuyEvolution(
    makeEvolutionState({
      techs: ["nutrient_harvest"],
      infrastructureUnlocked: true,
    }),
    { type: "BUY_EVOLUTION", payload: { archetypeId: "reserve_buffer" } },
    DEV_MUTATION_CATALOG
  );
  const openReserveB = handleBuyEvolution(
    makeEvolutionState({
      techs: ["nutrient_harvest"],
      infrastructureUnlocked: true,
    }),
    { type: "BUY_EVOLUTION", payload: { archetypeId: "reserve_buffer" } },
    DEV_MUTATION_CATALOG
  );
  const reserveMemoryA = findPatch(openReserveA, "/world/lineageMemory")?.value?.[1];
  const reserveMemoryB = findPatch(openReserveB, "/world/lineageMemory")?.value?.[1];
  assert(Array.isArray(reserveMemoryA?.techs) && reserveMemoryA.techs.includes("reserve_buffer"), "reserve_buffer unlock missing after infrastructure gate");
  assert(JSON.stringify(reserveMemoryA?.techs) === JSON.stringify(reserveMemoryB?.techs), "reserve_buffer tech unlock must be deterministic");

  const coopA = handleBuyEvolution(
    makeEvolutionState({
      techs: ["light_harvest"],
      patternCatalog: [{ id: "line", discovered: true }],
      networkRatio: 0.12,
    }),
    { type: "BUY_EVOLUTION", payload: { archetypeId: "cooperative_network" } },
    DEV_MUTATION_CATALOG
  );
  const coopB = handleBuyEvolution(
    makeEvolutionState({
      techs: ["light_harvest"],
      patternCatalog: [{ id: "line", discovered: true }],
      networkRatio: 0.12,
    }),
    { type: "BUY_EVOLUTION", payload: { archetypeId: "cooperative_network" } },
    DEV_MUTATION_CATALOG
  );
  const coopMemoryA = findPatch(coopA, "/world/lineageMemory")?.value?.[1];
  const coopMemoryB = findPatch(coopB, "/world/lineageMemory")?.value?.[1];
  assert(Array.isArray(coopMemoryA?.techs) && coopMemoryA.techs.includes("cooperative_network"), "cooperative_network unlock missing");
  assert(Array.isArray(coopMemoryA?.synergies) && coopMemoryA.synergies.includes("photon_mesh"), "cooperative_network must unlock photon_mesh synergy with light_harvest");
  assert(JSON.stringify(coopMemoryA?.synergies) === JSON.stringify(coopMemoryB?.synergies), "synergy unlock must be deterministic");
}

console.log("PHASE_F_PROGRESSION_INTEGRITY_OK progression gates, preset goals, canonical losses, and additive tech unlocks verified");

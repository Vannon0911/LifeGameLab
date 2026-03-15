import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-f-progression-integrity.mjs");

import { WIN_MODE, WIN_MODE_SELECTABLE } from "../src/game/contracts/ids.js";
import { deriveStageState } from "../src/game/sim/reducer/progression.js";
import { handleBuyEvolution } from "../src/game/sim/playerActions.js";
import { DEV_MUTATION_CATALOG } from "../src/game/sim/reducer/techTreeOps.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeBuyState(simPatch = {}, techs = ["light_harvest"]) {
  return {
    meta: { playerLineageId: 1 },
    world: {
      alive: new Uint8Array([1, 1, 1, 1]),
      lineageId: new Uint32Array([1, 1, 1, 1]),
      trait: new Float32Array(28),
      hue: new Float32Array(4),
      lineageMemory: { 1: { techs, synergies: [], splitUnlock: 0 } },
    },
    sim: {
      playerStage: 2,
      playerDNA: 40,
      unlockedZoneTier: 2,
      infrastructureUnlocked: false,
      patternCatalog: {},
      patternBonuses: {},
      networkRatio: 0.12,
      playerAliveCount: 12,
      clusterRatio: 0.2,
      ...simPatch,
    },
  };
}

assert(WIN_MODE.CORE_COLLAPSE === "core_collapse", "missing core collapse win mode");
assert(WIN_MODE.VISION_BREAK === "vision_break", "missing vision break win mode");
assert(WIN_MODE.NETWORK_DECAY === "network_decay", "missing network decay win mode");
assert(JSON.stringify(WIN_MODE_SELECTABLE) === JSON.stringify([WIN_MODE.SUPREMACY, WIN_MODE.STOCKPILE, WIN_MODE.EFFICIENCY]), "WIN_MODE_SELECTABLE must remain unchanged");

{
  const blocked = handleBuyEvolution(makeBuyState(), { payload: { archetypeId: "cooperative_network" } }, DEV_MUTATION_CATALOG);
  assert(blocked.length === 0, "cooperative_network must stay blocked without patterns");

  const unlocked = handleBuyEvolution(makeBuyState({
    patternCatalog: { line: [{ zoneId: 3 }] },
    patternBonuses: { energy: 0.03 },
  }), { payload: { archetypeId: "cooperative_network" } }, DEV_MUTATION_CATALOG);
  assert(unlocked.some((patch) => patch.path === "/world/lineageMemory"), "cooperative_network should unlock once run requirements are met");
}

{
  const clusterSplitBlocked = handleBuyEvolution(makeBuyState({
    playerStage: 2,
    patternCatalog: { line: [{ zoneId: 3 }] },
  }, ["light_harvest", "cooperative_network"]), { payload: { archetypeId: "cluster_split" } }, DEV_MUTATION_CATALOG);
  assert(clusterSplitBlocked.length === 0, "cluster_split must stay blocked without infrastructure");
}

{
  const world = {
    alive: new Uint8Array(16),
    lineageId: new Uint32Array(16),
    biomeId: new Int8Array(16),
    lineageMemory: {},
  };
  for (let i = 0; i < 10; i++) {
    world.alive[i] = 1;
    world.lineageId[i] = 1;
    world.biomeId[i] = i < 5 ? 1 : 2;
  }

  const baseSim = {
    playerStage: 1,
    playerDNA: 40,
    harvestYieldTotal: 10,
    pruneYieldTotal: 10,
    recycleYieldTotal: 0,
    seedYieldTotal: 0,
    playerAliveCount: 10,
    playerEnergyNet: 1,
    clusterRatio: 0.15,
    lineageDiversity: 2,
    meanWaterField: 0.12,
    plantTileRatio: 0.2,
    meanToxinField: 0.05,
    networkRatio: 0.2,
    stageProgressScore: 1,
  };

  const noDnaCommit = deriveStageState(world, { ...baseSim, dnaZoneCommitted: false }, { playerLineageId: 1 });
  assert(noDnaCommit.playerStage < 3, `stage 3 must stay blocked without dna commit, got S${noDnaCommit.playerStage}`);

  const dnaCommitted = deriveStageState(world, { ...baseSim, dnaZoneCommitted: true }, { playerLineageId: 1 });
  assert(dnaCommitted.playerStage >= 3, `stage 3 should unlock after dna commit, got S${dnaCommitted.playerStage}`);

  const noInfra = deriveStageState(world, { ...baseSim, playerStage: 3, dnaZoneCommitted: true, infrastructureUnlocked: false }, { playerLineageId: 1 });
  assert(noInfra.playerStage < 4, `stage 4 must stay blocked without infrastructure, got S${noInfra.playerStage}`);

  const noPattern = deriveStageState(world, { ...baseSim, playerStage: 4, dnaZoneCommitted: true, infrastructureUnlocked: true, patternCatalog: {}, patternBonuses: {} }, { playerLineageId: 1 });
  assert(noPattern.playerStage < 5, `stage 5 must stay blocked without positive pattern signal, got S${noPattern.playerStage}`);

  const withPattern = deriveStageState(world, {
    ...baseSim,
    playerStage: 4,
    dnaZoneCommitted: true,
    infrastructureUnlocked: true,
    patternCatalog: { line: [{ zoneId: 3 }] },
    patternBonuses: { energy: 0.04 },
  }, { playerLineageId: 1 });
  assert(withPattern.playerStage >= 5, `stage 5 should unlock with pattern bonus, got S${withPattern.playerStage}`);
}

console.log("PHASE_F_PROGRESSION_INTEGRITY_OK run requirements, stage gates, and selectable win modes stay contract-safe");

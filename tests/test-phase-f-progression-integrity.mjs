import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-f-progression-integrity.mjs");

import { makeInitialState } from "../src/project/project.logic.js";
import { GAME_RESULT, GOAL_CODE, WIN_MODE } from "../src/game/contracts/ids.js";
import { deriveStageState, deriveGoalCodeWithPresetBias } from "../src/game/sim/reducer/progression.js";
import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function buildWorld() {
  const size = 16;
  const alive = new Uint8Array(size);
  const lineageId = new Uint32Array(size);
  const biomeId = new Int8Array(size);
  for (let i = 0; i < size; i++) {
    alive[i] = i < 10 ? 1 : 0;
    lineageId[i] = i < 10 ? 1 : 0;
    biomeId[i] = i % 2 === 0 ? 1 : 2;
  }
  return {
    w: 4,
    h: 4,
    alive,
    lineageId,
    biomeId,
    lineageMemory: {
      1: {
        biomeUsageTicks: {
          1: 50,
          2: 50,
        },
      },
    },
    visibility: new Uint8Array(size),
  };
}

const worldA = buildWorld();
const worldB = buildWorld();
const baseSim = {
  playerDNA: 50,
  harvestYieldTotal: 10,
  pruneYieldTotal: 10,
  recycleYieldTotal: 10,
  seedYieldTotal: 10,
  playerAliveCount: 10,
  clusterRatio: 0.20,
  playerEnergyNet: 2,
  lineageDiversity: 2,
  meanWaterField: 0.20,
  plantTileRatio: 0.20,
  meanToxinField: 0.05,
  playerStage: 2,
  dnaZoneCommitted: true,
  infrastructureUnlocked: true,
  patternCatalog: {
    line: { count: 1, zoneIds: [1], anchors: [1] },
    block: { count: 1, zoneIds: [2], anchors: [2] },
  },
  patternBonuses: { energy: 0.5, dna: 0.3, stability: 0.1, vision: 0, defense: 0, transport: 0 },
  networkRatio: 0.20,
};
const meta = { playerLineageId: 1, worldPresetId: "river_delta" };

const stageA = deriveStageState(worldA, baseSim, meta);
const stageB = deriveStageState(worldB, baseSim, meta);
assert(JSON.stringify(stageA) === JSON.stringify(stageB), "stage derivation must be deterministic");
assert(Number(stageA.playerStage || 0) >= 4, `stage should advance with dna+infra+patterns, got ${stageA.playerStage}`);

const noInfraStage = deriveStageState(buildWorld(), { ...baseSim, playerStage: 3, infrastructureUnlocked: false }, meta);
assert(Number(noInfraStage.playerStage || 0) < 4, "stage 4 must stay blocked without infrastructure");

const noPatternsStage = deriveStageState(buildWorld(), {
  ...baseSim,
  playerStage: 4,
  patternCatalog: {},
  patternBonuses: { energy: 0, dna: 0, stability: 0, vision: 0, defense: 0, transport: 0 },
}, meta);
assert(Number(noPatternsStage.playerStage || 0) < 5, "stage 5 must stay blocked without pattern state");

const harvestOnlyStage = deriveStageState(buildWorld(), {
  ...baseSim,
  playerStage: 2,
  dnaZoneCommitted: false,
  infrastructureUnlocked: false,
  patternCatalog: {},
  patternBonuses: { energy: 0, dna: 0, stability: 0, vision: 0, defense: 0, transport: 0 },
  harvestYieldTotal: 40,
  pruneYieldTotal: 0,
  recycleYieldTotal: 0,
  seedYieldTotal: 0,
}, meta);
assert(Number(harvestOnlyStage.playerStage || 0) < 3, "legacy metrics alone must not force stage 3");

assert(
  deriveGoalCodeWithPresetBias({ ...baseSim, infrastructureUnlocked: true, networkRatio: 0.20, playerEnergyNet: 2 }, { worldPresetId: "river_delta" }, GOAL_CODE.HARVEST_SECURE) === GOAL_CODE.EXPANSION,
  "river_delta bias drift"
);
assert(
  deriveGoalCodeWithPresetBias({ ...baseSim, playerEnergyNet: 1 }, { worldPresetId: "dry_basin" }, GOAL_CODE.HARVEST_SECURE) === GOAL_CODE.SURVIVE_ENERGY,
  "dry_basin bias drift"
);
assert(
  deriveGoalCodeWithPresetBias({ ...baseSim, playerDNA: 50 }, { worldPresetId: "wet_meadow" }, GOAL_CODE.HARVEST_SECURE) === GOAL_CODE.EVOLUTION_READY,
  "wet_meadow bias drift"
);

const resultState = makeInitialState();
resultState.meta.playerLineageId = 1;
resultState.world = {
  ...buildWorld(),
  zoneRole: new Int8Array(16),
  visibility: new Uint8Array(16),
};
resultState.sim.unlockedZoneTier = 3;
resultState.sim.infrastructureUnlocked = true;
resultState.sim.winMode = WIN_MODE.SUPREMACY;

const lossA = { playerAliveCount: 1, playerEnergyNet: 1, playerEnergyIn: 4, cpuAliveCount: 1, cpuEnergyIn: 1 };
const lossB = { playerAliveCount: 1, playerEnergyNet: 1, playerEnergyIn: 4, cpuAliveCount: 1, cpuEnergyIn: 1 };
applyWinConditions(resultState, lossA, 61);
applyWinConditions(resultState, lossB, 61);
assert(lossA.gameResult === GAME_RESULT.LOSS, "phase-f loss gate must resolve to loss");
assert(JSON.stringify(lossA) === JSON.stringify(lossB), "loss resolution must be deterministic");

console.log("PHASE_F_PROGRESSION_INTEGRITY_OK progression gates, preset bias, and deterministic losses verified");

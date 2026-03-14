import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-freeze-progression.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import { deriveStageState } from "../src/game/sim/reducer/progression.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "freeze-progression" });
store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
store.dispatch({ type: "SET_PLACEMENT_COST", payload: { enabled: false } });

const state = store.getState();
const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
let harvestIndex = -1;
for (let i = 0; i < state.world.alive.length; i++) {
  if (state.world.alive[i] !== 1) continue;
  if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
  harvestIndex = i;
  break;
}
assert(harvestIndex >= 0, "no player cell found for HARVEST_CELL regression");

const x = harvestIndex % state.world.w;
const y = (harvestIndex / state.world.w) | 0;
const stageBefore = Number(state.sim.playerStage || 1);
const totalBefore = Number(state.sim.totalHarvested || 0);
store.dispatch({ type: "HARVEST_CELL", payload: { x, y } });
const after = store.getState();

assert(Number(after.sim.totalHarvested || 0) === totalBefore + 1, "HARVEST_CELL must still update totalHarvested telemetry");
assert(Number(after.sim.playerStage || 1) === stageBefore, "HARVEST_CELL must not advance playerStage");

{
  const world = {
    alive: new Uint8Array([1, 1, 1, 1]),
    lineageId: new Uint32Array([1, 1, 1, 1]),
    biomeId: new Uint8Array([1, 1, 2, 2]),
    lineageMemory: { 1: { biomeUsageTicks: { 1: 80, 2: 80 } } },
  };
  const simLike = {
    playerStage: 2,
    playerDNA: 70,
    harvestYieldTotal: 40,
    pruneYieldTotal: 20,
    recycleYieldTotal: 20,
    seedYieldTotal: 20,
    totalHarvested: 999,
    playerAliveCount: 18,
    clusterRatio: 0.42,
    playerEnergyNet: 3,
    lineageDiversity: 8,
    meanWaterField: 0.24,
    plantTileRatio: 0.24,
    meanToxinField: 0.02,
    infrastructureUnlocked: false,
    dnaZoneCommitted: false,
    networkRatio: 0.30,
  };
  const stageState = deriveStageState(world, simLike, { playerLineageId: 1 });
  assert(stageState.playerStage === 2, `telemetry-only progression drifted to stage ${stageState.playerStage}`);
}

console.log("FREEZE_PROGRESSION_OK HARVEST_CELL stays telemetry-only for stage progression");

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-freeze-progression.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "freeze-progression" });
store.dispatch({ type: "GEN_WORLD" });
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

console.log("FREEZE_PROGRESSION_OK HARVEST_CELL stays telemetry-only for stage progression");

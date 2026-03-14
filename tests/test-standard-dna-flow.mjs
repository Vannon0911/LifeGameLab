import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-standard-dna-flow.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function patchPlayerCells(store, cells) {
  const state = store.getState();
  const alive = new Uint8Array(state.world.alive);
  const lineageId = new Uint32Array(state.world.lineageId);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (const { x, y } of cells) {
    const idx = y * state.world.w + x;
    alive[idx] = 1;
    lineageId[idx] = playerLineageId;
  }
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/world/alive", value: alive },
        { op: "set", path: "/world/lineageId", value: lineageId },
      ],
    },
  });
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "standard-dna-flow-1" });
store.dispatch({ type: "GEN_WORLD" });
store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });

const start = store.getState();
const preset = getWorldPreset(start.meta.worldPresetId);
const range = getStartWindowRange(preset.startWindows.player, start.world.w, start.world.h);
const founders = [
  { x: range.x0, y: range.y0 },
  { x: range.x0 + 1, y: range.y0 },
  { x: range.x0, y: range.y0 + 1 },
  { x: range.x0 + 1, y: range.y0 + 1 },
];
for (const founder of founders) {
  store.dispatch({ type: "PLACE_CELL", payload: { ...founder, remove: false } });
}
store.dispatch({ type: "CONFIRM_FOUNDATION" });
store.dispatch({ type: "CONFIRM_CORE_ZONE" });

store.dispatch({
  type: "APPLY_BUFFERED_SIM_STEP",
  payload: {
    patches: [{ op: "set", path: "/sim/zoneUnlockProgress", value: 1 }],
  },
});
const active = store.getState();
const coreIndices = [];
for (let i = 0; i < active.world.coreZoneMask.length; i++) {
  if ((Number(active.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
}
const coreXY = coreIndices.map((idx) => ({ x: idx % active.world.w, y: (idx / active.world.w) | 0 }));
const minX = Math.min(...coreXY.map((pos) => pos.x));
const maxY = Math.max(...coreXY.map((pos) => pos.y));
const validCells = [
  { x: minX - 1, y: coreXY[0].y },
  { x: minX - 1, y: maxY },
  { x: minX - 1, y: maxY + 1 },
  { x: minX, y: maxY + 1 },
];
patchPlayerCells(store, validCells);
store.dispatch({ type: "START_DNA_ZONE_SETUP" });
const inSetup = store.getState();
assert(inSetup.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "dna flow must enter setup phase");
for (const cell of validCells) {
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
}
store.dispatch({ type: "CONFIRM_DNA_ZONE" });
const afterCommit = store.getState();
assert(afterCommit.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "dna flow must return to active run");
assert(afterCommit.sim.dnaZoneCommitted === true, "dna flow must commit dna zone");
assert(afterCommit.sim.unlockedZoneTier === 2, "dna flow must unlock tier 2");
assert(afterCommit.sim.nextZoneUnlockKind === "INFRA", "dna flow must point to infra next");
assert(afterCommit.sim.running === true, "dna flow must restart after dna confirm");

console.log("STANDARD_DNA_FLOW_OK standard flow reaches dna setup and returns to active run");

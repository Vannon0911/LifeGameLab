import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-toggle-dna-zone-cell.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createActiveCoreStore(seed, presetId = "river_delta") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  if (presetId !== "river_delta") {
    store.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId } });
  }
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  const state = store.getState();
  const preset = getWorldPreset(state.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, state.world.w, state.world.h);
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
      patches: [
        { op: "set", path: "/sim/zoneUnlockProgress", value: 1 },
      ],
    },
  });
  return store;
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

const store = createActiveCoreStore("toggle-dna-zone-cell-1");
const activeState = store.getState();
assert(activeState.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "test requires active run before dna setup");

const coreIndices = [];
for (let i = 0; i < activeState.world.coreZoneMask.length; i++) {
  if ((Number(activeState.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
}
const coreXY = coreIndices.map((idx) => ({ x: idx % activeState.world.w, y: (idx / activeState.world.w) | 0 }));
const minX = Math.min(...coreXY.map((pos) => pos.x));
const maxX = Math.max(...coreXY.map((pos) => pos.x));
const minY = Math.min(...coreXY.map((pos) => pos.y));
const maxY = Math.max(...coreXY.map((pos) => pos.y));

const validCells = [
  { x: minX - 1, y: minY },
  { x: minX - 1, y: maxY },
  { x: minX - 1, y: maxY + 1 },
  { x: minX, y: maxY + 1 },
];
const blockedFar = { x: maxX + 4, y: maxY + 4 };

patchPlayerCells(store, [...validCells, blockedFar]);
store.dispatch({ type: "START_DNA_ZONE_SETUP" });
const state = store.getState();
assert(state.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "test requires dna zone setup");

// overlap with core is forbidden.
{
  const before = store.getSignature();
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { x: minX, y: minY, remove: false } });
  assert(store.getSignature() === before, "core-overlap dna placement must stay blocked");
}

// non-adjacent owned cell is forbidden.
{
  const before = store.getSignature();
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...blockedFar, remove: false } });
  assert(store.getSignature() === before, "non-adjacent dna placement must stay blocked");
}

// valid chain placement consumes budget down to zero, fifth add is blocked.
for (let i = 0; i < validCells.length; i++) {
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...validCells[i], remove: false } });
  const next = store.getState();
  assert(Number(next.world.dnaZoneMask[validCells[i].y * next.world.w + validCells[i].x] || 0) === 1, `dna placement ${i} missing`);
  assert(next.sim.zone2PlacementBudget === 3 - i, `dna placement budget drift after add ${i}`);
}
{
  const before = store.getSignature();
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { x: maxX + 1, y: minY - 1, remove: false } });
  assert(store.getSignature() === before, "fifth dna placement must stay blocked at zero budget");
}

// removal before confirm is allowed and restores budget.
{
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...validCells[3], remove: true } });
  const after = store.getState();
  const idx = validCells[3].y * after.world.w + validCells[3].x;
  assert(Number(after.world.dnaZoneMask[idx] || 0) === 0, "dna removal must clear the selected tile");
  assert(after.sim.zone2PlacementBudget === 1, "dna removal must restore one budget slot");
}

console.log("TOGGLE_DNA_ZONE_CELL_OK ownership adjacency budget and removal verified");

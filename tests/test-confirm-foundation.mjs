import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-confirm-foundation.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createGenesisStore(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  return store;
}

function getPlayerWindowTiles(state) {
  const preset = getWorldPreset(state.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, state.world.w, state.world.h);
  const tiles = [];
  for (let y = range.y0; y < range.y1; y++) {
    for (let x = range.x0; x < range.x1; x++) {
      tiles.push({ x, y, idx: y * state.world.w + x });
    }
  }
  return { range, tiles };
}

function placeFounders(store, points) {
  for (const p of points) {
    store.dispatch({ type: "PLACE_CELL", payload: { x: p.x, y: p.y, remove: false } });
  }
}

// success path: exactly 4 founders, connected, in window.
{
  const store = createGenesisStore("confirm-success-1");
  const s = store.getState();
  const { tiles } = getPlayerWindowTiles(s);
  const connected = [tiles[0], tiles[1], tiles[4], tiles[5]];
  placeFounders(store, connected);
  const before = store.getState();
  assert(before.sim.runPhase === RUN_PHASE.GENESIS_SETUP, "runPhase must start in genesis");
  store.dispatch({ type: "CONFIRM_FOUNDATION" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "CONFIRM_FOUNDATION must activate run");
  assert(after.sim.running === true, "CONFIRM_FOUNDATION must set running=true");
}

// fewer than 4 founders must be blocked.
{
  const store = createGenesisStore("confirm-fewer-1");
  const { tiles } = getPlayerWindowTiles(store.getState());
  placeFounders(store, [tiles[0], tiles[1], tiles[2]]);
  store.dispatch({ type: "CONFIRM_FOUNDATION" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.GENESIS_SETUP, "confirm with <4 founders must be blocked");
  assert(after.sim.running === false, "confirm with <4 founders must not start");
}

// disjoint founders must be blocked.
{
  const store = createGenesisStore("confirm-disjoint-1");
  const { range } = getPlayerWindowTiles(store.getState());
  const disjoint = [
    { x: range.x0, y: range.y0 },
    { x: range.x1 - 1, y: range.y0 },
    { x: range.x0, y: range.y1 - 1 },
    { x: range.x1 - 1, y: range.y1 - 1 },
  ];
  placeFounders(store, disjoint);
  store.dispatch({ type: "CONFIRM_FOUNDATION" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.GENESIS_SETUP, "disjoint founders must block confirm");
  assert(after.sim.running === false, "disjoint founders must not start run");
}

// inconsistent founder ownership must be blocked.
{
  const store = createGenesisStore("confirm-foreign-1");
  const s0 = store.getState();
  const { tiles } = getPlayerWindowTiles(s0);
  const connected = [tiles[0], tiles[1], tiles[4], tiles[5]];
  placeFounders(store, connected);
  const s1 = store.getState();
  const tamperedLineage = new s1.world.lineageId.constructor(s1.world.lineageId);
  tamperedLineage[connected[0].idx] = Number(s1.meta.cpuLineageId || 2) | 0;
  const tamperedState = {
    ...s1,
    world: { ...s1.world, lineageId: tamperedLineage },
  };
  const patches = reducer(tamperedState, { type: "CONFIRM_FOUNDATION" }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "foreign founder ownership must block confirm");
}

// inconsistent founderMask count must be blocked.
{
  const store = createGenesisStore("confirm-mask-1");
  const s0 = store.getState();
  const { tiles } = getPlayerWindowTiles(s0);
  const connected = [tiles[0], tiles[1], tiles[4], tiles[5]];
  placeFounders(store, connected);
  const s1 = store.getState();
  const tamperedMask = new s1.world.founderMask.constructor(s1.world.founderMask);
  tamperedMask[connected[0].idx] = 0;
  const tamperedState = {
    ...s1,
    world: { ...s1.world, founderMask: tamperedMask },
  };
  const patches = reducer(tamperedState, { type: "CONFIRM_FOUNDATION" }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "inconsistent founderMask must block confirm");
}

// lab mode should ignore confirm.
{
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: "confirm-lab-1" });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  const before = store.getState();
  store.dispatch({ type: "CONFIRM_FOUNDATION" });
  const after = store.getState();
  assert(after.sim.runPhase === before.sim.runPhase, "lab confirm must not change runPhase");
  assert(after.sim.running === before.sim.running, "lab confirm must not change running");
}

console.log("CONFIRM_FOUNDATION_OK validation gates and activation path verified");

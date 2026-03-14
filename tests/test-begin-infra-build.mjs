import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-begin-infra-build.mjs");

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

function createCommittedDnaStore(seed, presetId = "river_delta") {
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
  const minY = Math.min(...coreXY.map((pos) => pos.y));
  const maxY = Math.max(...coreXY.map((pos) => pos.y));
  const validCells = [
    { x: minX - 1, y: minY },
    { x: minX - 1, y: maxY },
    { x: minX - 1, y: maxY + 1 },
    { x: minX, y: maxY + 1 },
  ];
  patchPlayerCells(store, validCells);
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  for (const cell of validCells) {
    store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });
  return store;
}

{
  const store = createCommittedDnaStore("begin-infra-build-blocked-1");
  const sigBefore = store.getSignature();
  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  assert(store.getSignature() === sigBefore, "infra build must stay blocked without required dna");
}

{
  const store = createCommittedDnaStore("begin-infra-build-success-1", "dry_basin");
  const before = store.getState();
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/sim/playerDNA", value: 40 },
        { op: "set", path: "/sim/playerEnergyStored", value: 20 },
      ],
    },
  });
  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  const after = store.getState();
  assert(before.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "infra build requires active run");
  assert(after.sim.infraBuildMode === "path", "infra build must enter path mode");
  assert(after.sim.running === false, "infra build start must pause run");
  assert(after.world.infraCandidateMask.every((value) => (Number(value) | 0) === 0), "infra candidate mask must start empty");
}

console.log("BEGIN_INFRA_BUILD_OK dna gate and path mode transition verified");

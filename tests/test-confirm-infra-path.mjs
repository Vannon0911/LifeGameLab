import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-confirm-infra-path.mjs");

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

function patchPlayerEnergy(store, energyPerCell = 5) {
  const state = store.getState();
  const E = new Float32Array(state.world.E);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (let i = 0; i < E.length; i++) {
    if ((Number(state.world.alive[i]) | 0) !== 1) continue;
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    E[i] = energyPerCell;
  }
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/world/E", value: E },
        { op: "set", path: "/sim/playerEnergyStored", value: energyPerCell * 4 },
      ],
    },
  });
}

function createInfraCommitStore(seed, presetId = "river_delta") {
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
  const validDnaCells = [
    { x: minX - 1, y: minY },
    { x: minX - 1, y: maxY },
    { x: minX - 1, y: maxY + 1 },
    { x: minX, y: maxY + 1 },
  ];
  patchPlayerCells(store, validDnaCells);
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  for (const cell of validDnaCells) {
    store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });
  const pathCells = [
    coreXY[0],
    { x: minX - 1, y: minY },
  ];
  patchPlayerCells(store, pathCells);
  patchPlayerEnergy(store, 6);
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/sim/playerDNA", value: 80 },
        { op: "set", path: "/sim/playerEnergyStored", value: 24 },
      ],
    },
  });
  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  return { store, pathCells };
}

{
  const { store, pathCells } = createInfraCommitStore("confirm-infra-path-success-1");
  for (const cell of pathCells) {
    store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...cell, remove: false } });
  }
  const before = store.getState();
  const dnaBefore = Number(before.sim.playerDNA || 0);
  const energyBefore = Number(before.sim.playerEnergyStored || 0);
  assert(before.sim.infraBuildMode === "path", "infra confirm requires path mode");
  store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "infra confirm must stay in active run phase");
  assert(after.sim.running === true, "infra confirm must restart the run");
  assert(after.sim.infrastructureUnlocked === true, "infra confirm must unlock infrastructure");
  assert(after.sim.infraBuildMode === "", "infra confirm must leave build mode");
  assert(Number(after.sim.playerDNA || 0) === dnaBefore - 38, "infra confirm must spend unlock dna plus build dna");
  assert(Math.round(Number(after.sim.playerEnergyStored || 0) * 1000) === Math.round((energyBefore - 10) * 1000), "infra confirm must spend stored energy");
  for (const cell of pathCells) {
    const idx = cell.y * after.world.w + cell.x;
    assert(Number(after.world.link[idx] || 0) > 0, "infra confirm must commit staged path to world.link");
    assert(Number(after.world.infraCandidateMask[idx] || 0) === 0, "infra confirm must clear staged candidate path");
  }
}

console.log("CONFIRM_INFRA_PATH_OK commit and cost path verified");

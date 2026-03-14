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
  const farCell = {
    x: Math.min(active.world.w - 1, minX + 5),
    y: Math.min(active.world.h - 1, maxY + 4),
  };
  patchPlayerCells(store, [farCell]);
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
  return { store, pathCells, farCell };
}

function assertFloatArrayEqual(a, b, msg) {
  assert(a.length === b.length, `${msg}: length mismatch`);
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(Number(a[i] || 0) - Number(b[i] || 0)) > 1e-9) {
      throw new Error(`${msg}: mismatch at ${i}`);
    }
  }
}

{
  const { store } = createInfraCommitStore("confirm-infra-path-abort-1");
  const before = store.getState();
  const linkBefore = new Float32Array(before.world.link);
  const energyBefore = new Float32Array(before.world.E);
  const dnaBefore = Number(before.sim.playerDNA || 0);
  const storedEnergyBefore = Number(before.sim.playerEnergyStored || 0);
  assert(before.sim.infraBuildMode === "path", "empty confirm requires path mode");
  assert(before.sim.running === false, "begin infra build must pause run before abort");
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  const blockedResume = store.getState();
  assert(blockedResume.sim.running === false, "manual resume must stay blocked while infra build mode is active");
  store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "empty confirm abort must stay in active run phase");
  assert(after.sim.running === true, "empty confirm abort must restart the run");
  assert(after.sim.infraBuildMode === "", "empty confirm abort must leave build mode");
  assert(after.sim.infrastructureUnlocked === false, "empty confirm abort must not unlock infrastructure");
  assert(Number(after.sim.playerDNA || 0) === dnaBefore, "empty confirm abort must not spend dna");
  assert(Number(after.sim.playerEnergyStored || 0) === storedEnergyBefore, "empty confirm abort must not spend stored energy");
  assertFloatArrayEqual(after.world.link, linkBefore, "empty confirm abort must leave world.link unchanged");
  assertFloatArrayEqual(after.world.E, energyBefore, "empty confirm abort must leave world.E unchanged");
  assert(after.world.infraCandidateMask.every((value) => (Number(value || 0) | 0) === 0), "empty confirm abort must keep candidate mask empty");
}

{
  const { store, pathCells, farCell } = createInfraCommitStore("confirm-infra-path-invalid-1");
  const invalidState = store.getState();
  const candidateMask = new Uint8Array(invalidState.world.infraCandidateMask);
  const anchorIdx = pathCells[0].y * invalidState.world.w + pathCells[0].x;
  const farIdx = farCell.y * invalidState.world.w + farCell.x;
  candidateMask[anchorIdx] = 1;
  candidateMask[farIdx] = 1;
  const tamperedState = {
    ...invalidState,
    world: {
      ...invalidState.world,
      infraCandidateMask: candidateMask,
    },
  };
  const patches = reducer(tamperedState, { type: "CONFIRM_INFRA_PATH", payload: {} }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "invalid non-empty staged infra path must stay blocked");
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

console.log("CONFIRM_INFRA_PATH_OK abort, invalid, and commit paths verified");

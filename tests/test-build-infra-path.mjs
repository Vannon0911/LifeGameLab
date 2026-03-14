import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-build-infra-path.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE } from "../src/game/contracts/ids.js";
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

function createInfraBuildStore(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
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
  const chain = [
    coreXY[0],
    { x: minX - 1, y: minY },
    { x: minX - 2, y: minY },
  ];
  patchPlayerCells(store, chain);
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/sim/playerDNA", value: 60 },
        { op: "set", path: "/sim/playerEnergyStored", value: 20 },
      ],
    },
  });
  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  return { store, chain, farCell: { x: minX - 4, y: minY + 3 } };
}

{
  const { store, chain, farCell } = createInfraBuildStore("build-infra-path-1");
  const before = store.getSignature();
  store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...farCell, remove: false } });
  assert(store.getSignature() === before, "non-adjacent infra path tile must stay blocked");

  for (let i = 0; i < chain.length; i++) {
    store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...chain[i], remove: false } });
    const next = store.getState();
    const idx = chain[i].y * next.world.w + chain[i].x;
    assert(Number(next.world.infraCandidateMask[idx] || 0) === 1, `infra candidate tile ${i} missing`);
  }

  store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...chain[2], remove: true } });
  const afterRemove = store.getState();
  const removedIdx = chain[2].y * afterRemove.world.w + chain[2].x;
  assert(Number(afterRemove.world.infraCandidateMask[removedIdx] || 0) === 0, "infra candidate removal must clear staged tile");
}

console.log("BUILD_INFRA_PATH_OK semantic path staging verified");

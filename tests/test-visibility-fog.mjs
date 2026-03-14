import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-visibility-fog.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function indexOfCell(world, cell) {
  return cell.y * world.w + cell.x;
}

function patchWorld(store, patches) {
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: { patches },
  });
}

function patchPlayerCells(store, cells) {
  const state = store.getState();
  const alive = new Uint8Array(state.world.alive);
  const lineageId = new Uint32Array(state.world.lineageId);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (const cell of cells) {
    const idx = indexOfCell(state.world, cell);
    alive[idx] = 1;
    lineageId[idx] = playerLineageId;
  }
  patchWorld(store, [
    { op: "set", path: "/world/alive", value: alive },
    { op: "set", path: "/world/lineageId", value: lineageId },
  ]);
}

function patchPlayerEnergy(store, energyPerCell = 6) {
  const state = store.getState();
  const energy = new Float32Array(state.world.E);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  let stored = 0;
  for (let i = 0; i < energy.length; i++) {
    if ((Number(state.world.alive[i]) | 0) !== 1) continue;
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    energy[i] = energyPerCell;
    stored += energyPerCell;
  }
  patchWorld(store, [
    { op: "set", path: "/world/E", value: energy },
    { op: "set", path: "/sim/playerEnergyStored", value: stored },
  ]);
}

function clearPlayerAlive(store) {
  const state = store.getState();
  const alive = new Uint8Array(state.world.alive);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (let i = 0; i < alive.length; i++) {
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    alive[i] = 0;
  }
  patchWorld(store, [{ op: "set", path: "/world/alive", value: alive }]);
}

function runStep(store) {
  store.dispatch({ type: "SIM_STEP", payload: {} });
  return store.getState();
}

function revealRadius(target, w, h, cx, cy, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      target[y * w + x] = 1;
    }
  }
}

function deriveExpectedVisibility(state) {
  const { world } = state;
  const preset = getWorldPreset(state.meta.worldPresetId);
  const phaseD = preset.phaseD || {};
  const radii = {
    core: Number(phaseD.visionRadiusCore || 0) | 0,
    dna: Number(phaseD.visionRadiusDNA || 0) | 0,
    infra: Number(phaseD.visionRadiusInfra || 0) | 0,
  };
  const out = new Uint8Array(world.w * world.h);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (let i = 0; i < out.length; i++) {
    if ((Number(world.alive[i]) | 0) !== 1) continue;
    if ((Number(world.lineageId[i]) | 0) !== playerLineageId) continue;
    const x = i % world.w;
    const y = (i / world.w) | 0;
    if ((Number(world.coreZoneMask[i]) | 0) === 1) revealRadius(out, world.w, world.h, x, y, radii.core);
    if ((Number(world.dnaZoneMask[i]) | 0) === 1) revealRadius(out, world.w, world.h, x, y, radii.dna);
    if (Number(world.link[i] || 0) > 0) revealRadius(out, world.w, world.h, x, y, radii.infra);
  }
  return out;
}

function assertMaskEquals(actual, expected, label) {
  assert(actual.length === expected.length, `${label} length mismatch`);
  for (let i = 0; i < actual.length; i++) {
    if ((Number(actual[i]) | 0) !== (Number(expected[i]) | 0)) {
      throw new Error(`${label} mismatch at ${i}: actual=${actual[i]} expected=${expected[i]}`);
    }
  }
}

function buildProgressionStore(seed = "visibility-fog-seed-1") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
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
  return store;
}

const store = buildProgressionStore();

const afterCore = runStep(store);
assertMaskEquals(afterCore.world.visibility, deriveExpectedVisibility(afterCore), "core visibility");

const coreIndices = [];
for (let i = 0; i < afterCore.world.coreZoneMask.length; i++) {
  if ((Number(afterCore.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
}
const coreXY = coreIndices.map((idx) => ({ x: idx % afterCore.world.w, y: (idx / afterCore.world.w) | 0 }));
const minX = Math.min(...coreXY.map((pos) => pos.x));
const minY = Math.min(...coreXY.map((pos) => pos.y));
const maxY = Math.max(...coreXY.map((pos) => pos.y));

const coreVisibleCell = { x: minX + 2, y: minY };
assert(Number(afterCore.world.visibility[indexOfCell(afterCore.world, coreVisibleCell)] || 0) === 1, "core radius must reveal nearby tiles");

patchWorld(store, [{ op: "set", path: "/sim/zoneUnlockProgress", value: 1 }]);
const dnaCells = [
  { x: minX - 1, y: minY },
  { x: minX - 1, y: maxY },
  { x: minX - 1, y: maxY + 1 },
  { x: minX, y: maxY + 1 },
];
patchPlayerCells(store, dnaCells);
store.dispatch({ type: "START_DNA_ZONE_SETUP" });
for (const cell of dnaCells) {
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
}
store.dispatch({ type: "CONFIRM_DNA_ZONE" });
patchPlayerEnergy(store, 6);

const afterDna = runStep(store);
assertMaskEquals(afterDna.world.visibility, deriveExpectedVisibility(afterDna), "dna visibility");

const dnaOnlyCell = { x: minX, y: maxY + 3 };
assert(Number(afterCore.world.visibility[indexOfCell(afterCore.world, dnaOnlyCell)] || 0) === 0, "dna-only tile must stay hidden before dna commit");
assert(Number(afterDna.world.visibility[indexOfCell(afterDna.world, dnaOnlyCell)] || 0) === 1, "dna radius must reveal dna-only tile");

const infraCells = [
  { x: minX - 1, y: maxY + 1 },
  { x: minX - 1, y: maxY + 2 },
  { x: minX - 1, y: maxY + 3 },
];
patchPlayerCells(store, infraCells);
patchPlayerEnergy(store, 6);
patchWorld(store, [
  { op: "set", path: "/sim/playerDNA", value: 80 },
  { op: "set", path: "/sim/playerEnergyStored", value: 48 },
]);
store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
for (const cell of infraCells) {
  store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...cell, remove: false } });
}
store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
patchPlayerEnergy(store, 6);

const afterInfra = runStep(store);
assertMaskEquals(afterInfra.world.visibility, deriveExpectedVisibility(afterInfra), "infra visibility");

let infraDeltaIdx = -1;
for (let i = 0; i < afterInfra.world.visibility.length; i++) {
  const wasVisible = (Number(afterDna.world.visibility[i]) | 0) === 1;
  const isVisible = (Number(afterInfra.world.visibility[i]) | 0) === 1;
  if (!wasVisible && isVisible) {
    infraDeltaIdx = i;
    break;
  }
}
assert(infraDeltaIdx >= 0, "infra step must reveal at least one new tile");

clearPlayerAlive(store);
const afterLossOfSight = runStep(store);
const priorVisibleIdx = infraDeltaIdx;
assert(Number(afterInfra.world.explored[priorVisibleIdx] || 0) === 1, "visible infra tile must be marked explored");
assert(Number(afterLossOfSight.world.visibility[priorVisibleIdx] || 0) === 0, "hidden tile must become non-visible again");
assert(Number(afterLossOfSight.world.explored[priorVisibleIdx] || 0) === 1, "explored must remain filled after vision disappears");

const neverSeenCell = { x: afterLossOfSight.world.w - 1, y: 0 };
const neverSeenIdx = indexOfCell(afterLossOfSight.world, neverSeenCell);
assert(Number(afterLossOfSight.world.visibility[neverSeenIdx] || 0) === 0, "distant unseen tile must remain hidden");
assert(Number(afterLossOfSight.world.explored[neverSeenIdx] || 0) === 0, "distant unseen tile must remain unexplored");

console.log("VISIBILITY_FOG_OK core dna infra vision and explored persistence verified");

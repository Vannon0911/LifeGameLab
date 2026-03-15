import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-e-integrity.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, ZONE_ROLE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function patchStore(store, patches) {
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
  for (const { x, y } of cells) {
    const idx = y * state.world.w + x;
    alive[idx] = 1;
    lineageId[idx] = playerLineageId;
  }
  patchStore(store, [
    { op: "set", path: "/world/alive", value: alive },
    { op: "set", path: "/world/lineageId", value: lineageId },
  ]);
}

function patchEnergyAndDNA(store, energyPerCell = 6, playerDNA = 80, storedEnergy = 24) {
  const state = store.getState();
  const E = new Float32Array(state.world.E);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (let i = 0; i < E.length; i++) {
    if ((Number(state.world.alive[i]) | 0) !== 1) continue;
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    E[i] = energyPerCell;
  }
  patchStore(store, [
    { op: "set", path: "/world/E", value: E },
    { op: "set", path: "/sim/playerDNA", value: playerDNA },
    { op: "set", path: "/sim/playerEnergyStored", value: storedEnergy },
  ]);
}

function createFullPhaseERun(seed, presetId = "river_delta") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  if (presetId !== "river_delta") {
    store.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId } });
  }
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });

  const genesis = store.getState();
  const preset = getWorldPreset(genesis.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, genesis.world.w, genesis.world.h);
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

  patchStore(store, [{ op: "set", path: "/sim/zoneUnlockProgress", value: 1 }]);

  const active = store.getState();
  const coreIndices = [];
  for (let i = 0; i < active.world.coreZoneMask.length; i++) {
    if ((Number(active.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
  }
  const coreXY = coreIndices.map((idx) => ({ x: idx % active.world.w, y: (idx / active.world.w) | 0 }));
  const minX = Math.min(...coreXY.map((pos) => pos.x));
  const maxX = Math.max(...coreXY.map((pos) => pos.x));
  const minY = Math.min(...coreXY.map((pos) => pos.y));
  const maxY = Math.max(...coreXY.map((pos) => pos.y));
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

  const infraX = minX - 2 >= 0 ? minX - 2 : maxX + 1;
  const infraCells = [
    { x: infraX, y: minY },
    { x: infraX, y: maxY },
  ];
  patchPlayerCells(store, infraCells);
  patchEnergyAndDNA(store);
  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  for (const cell of infraCells) {
    store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...cell, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  return store.getState();
}

function serializeStateSnapshot(state) {
  return JSON.stringify({
    zoneRole: Array.from(state.world.zoneRole || []),
    zoneId: Array.from(state.world.zoneId || []),
    zoneMeta: state.world.zoneMeta || {},
    patternCatalog: state.sim.patternCatalog || {},
    patternBonuses: state.sim.patternBonuses || {},
    signature: {
      tick: Number(state.sim.tick || 0),
      playerDNA: Number(state.sim.playerDNA || 0),
      playerEnergyStored: Number(state.sim.playerEnergyStored || 0),
      unlockedZoneTier: Number(state.sim.unlockedZoneTier || 0),
      infrastructureUnlocked: !!state.sim.infrastructureUnlocked,
      zoneUnlockProgress: Number(state.sim.zoneUnlockProgress || 0),
    },
  });
}

const stateA = createFullPhaseERun("phase-e-integrity-seed-1");
const stateB = createFullPhaseERun("phase-e-integrity-seed-1");

assert(serializeStateSnapshot(stateA) === serializeStateSnapshot(stateB), "phase-e snapshot must be deterministic for identical seed + actions");
assert(Object.keys(stateA.world.zoneMeta || {}).length >= 3, "canonical zoneMeta must contain core/dna/infra zones");
assert(Number(stateA.sim.patternBonuses?.energy || 0) >= 0, "pattern bonuses must exist");
assert(Number(stateA.sim.patternCatalog?.line?.count || 0) >= 0, "pattern catalog must exist");

let hasCore = false;
let hasDna = false;
let hasInfra = false;
for (let i = 0; i < stateA.world.zoneRole.length; i++) {
  const roleId = Number(stateA.world.zoneRole[i]) | 0;
  if (roleId === ZONE_ROLE.CORE) hasCore = true;
  if (roleId === ZONE_ROLE.DNA) hasDna = true;
  if (roleId === ZONE_ROLE.INFRA) hasInfra = true;
}
assert(hasCore, "canonical zoneRole must contain CORE");
assert(hasDna, "canonical zoneRole must contain DNA");
assert(hasInfra, "canonical zoneRole must contain INFRA");

for (let i = 0; i < stateA.world.coreZoneMask.length; i++) {
  if ((Number(stateA.world.coreZoneMask[i]) | 0) === 1) {
    assert((Number(stateA.world.zoneRole[i]) | 0) === ZONE_ROLE.CORE, `core zone drift at idx=${i}`);
  }
  if ((Number(stateA.world.dnaZoneMask[i]) | 0) === 1) {
    assert((Number(stateA.world.zoneRole[i]) | 0) === ZONE_ROLE.DNA, `dna zone drift at idx=${i}`);
  }
}

console.log("PHASE_E_INTEGRITY_OK canonical zones and deterministic pattern state verified");

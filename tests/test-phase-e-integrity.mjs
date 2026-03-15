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

function patchPlayerCells(store, cells) {
  const state = store.getState();
  const alive = new Uint8Array(state.world.alive);
  const lineageId = new Uint32Array(state.world.lineageId);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (const { x, y, alive: nextAlive = 1 } of cells) {
    const idx = y * state.world.w + x;
    alive[idx] = nextAlive ? 1 : 0;
    lineageId[idx] = nextAlive ? playerLineageId : 0;
  }
  store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches: [
    { op: "set", path: "/world/alive", value: alive },
    { op: "set", path: "/world/lineageId", value: lineageId },
  ] } });
}

function patchPlayerResources(store, energyPerCell = 6, dna = 80) {
  const state = store.getState();
  const E = new Float32Array(state.world.E);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  let stored = 0;
  for (let i = 0; i < E.length; i++) {
    if ((Number(state.world.alive[i]) | 0) !== 1) continue;
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    E[i] = energyPerCell;
    stored += energyPerCell;
  }
  store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches: [
    { op: "set", path: "/world/E", value: E },
    { op: "set", path: "/sim/playerEnergyStored", value: stored },
    { op: "set", path: "/sim/playerDNA", value: dna },
  ] } });
}

function buildInfraState(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  const start = store.getState();
  const preset = getWorldPreset(start.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, start.world.w, start.world.h);
  for (const founder of [
    { x: range.x0, y: range.y0 },
    { x: range.x0 + 1, y: range.y0 },
    { x: range.x0, y: range.y0 + 1 },
    { x: range.x0 + 1, y: range.y0 + 1 },
  ]) {
    store.dispatch({ type: "PLACE_CELL", payload: { ...founder, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_FOUNDATION" });
  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  store.dispatch({ type: "APPLY_BUFFERED_SIM_STEP", payload: { patches: [{ op: "set", path: "/sim/zoneUnlockProgress", value: 1 }] } });

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
  for (const cell of dnaCells) store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });

  const infraPath = [
    { x: maxX, y: minY },
    { x: maxX + 1, y: minY },
    { x: maxX + 2, y: minY },
    { x: maxX + 3, y: minY },
  ];
  patchPlayerCells(store, infraPath);
  patchPlayerResources(store, 6, 80);
  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  for (const cell of infraPath) store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...cell, remove: false } });
  store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  return store.getState();
}

function summarize(state) {
  return JSON.stringify({
    zoneMeta: state.world.zoneMeta,
    patternCatalog: state.sim.patternCatalog,
    patternBonuses: state.sim.patternBonuses,
  });
}

const a = buildInfraState("phase-e-integrity-1");
const b = buildInfraState("phase-e-integrity-1");
assert(summarize(a) === summarize(b), "phase-e deterministic snapshot drift for identical seed");
assert(Object.keys(a.sim.patternCatalog || {}).some((key) => Array.isArray(a.sim.patternCatalog[key]) && a.sim.patternCatalog[key].length > 0), "pattern catalog must contain detected patterns after infra flow");
assert(Number(a.sim.patternBonuses?.transport || 0) > 0, "infra path should yield positive transport bonus");

let coreSeen = 0;
let dnaSeen = 0;
let infraSeen = 0;
for (let i = 0; i < a.world.zoneRole.length; i++) {
  const role = Number(a.world.zoneRole[i] || 0) | 0;
  if (role === ZONE_ROLE.CORE) coreSeen++;
  if (role === ZONE_ROLE.DNA) dnaSeen++;
  if (role === ZONE_ROLE.INFRA) infraSeen++;
}
assert(coreSeen > 0, "canonical core zone missing");
assert(dnaSeen > 0, "canonical dna zone missing");
assert(infraSeen > 0, "canonical infra zone missing");

console.log("PHASE_E_INTEGRITY_OK canonical zones and pattern state are deterministic after core/dna/infra flow");

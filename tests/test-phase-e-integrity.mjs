import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-e-integrity.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE, ZONE_ROLE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createGenesisStore(seed, presetId = "river_delta") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  if (presetId !== "river_delta") {
    store.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId } });
  }
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  return store;
}

function placeFoundersAndConfirmCore(store) {
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
}

function getPlayerCells(state) {
  const out = [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (let i = 0; i < state.world.alive.length; i += 1) {
    if ((Number(state.world.alive[i]) | 0) !== 1) continue;
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    out.push({ idx: i, x: i % state.world.w, y: (i / state.world.w) | 0 });
  }
  return out;
}

function growPlayerCells(store, rounds) {
  const safeRounds = Math.max(0, Number(rounds || 0) | 0);
  if (safeRounds <= 0) return;
  store.dispatch({ type: "SET_PLACEMENT_COST", payload: { enabled: false } });
  for (let round = 0; round < safeRounds; round += 1) {
    const state = store.getState();
    const w = state.world.w;
    const h = state.world.h;
    const seen = new Set();
    for (const cell of getPlayerCells(state)) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const x = cell.x + dx;
          const y = cell.y + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const key = `${x},${y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          store.dispatch({ type: "PLACE_CELL", payload: { x, y, remove: false } });
        }
      }
    }
  }
}

function waitForZoneUnlockProgress(store, target = 1, maxSteps = 24) {
  const goal = Number(target);
  const steps = Math.max(1, Number(maxSteps || 1) | 0);
  for (let i = 0; i < steps; i += 1) {
    const state = store.getState();
    if (Number(state.sim.zoneUnlockProgress || 0) >= goal) return state;
    if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return state;
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }
  return store.getState();
}

function pickDnaCells(state, count = 4) {
  const out = [];
  const world = state.world;
  const w = world.w;
  const h = world.h;
  const coreMask = world.coreZoneMask;
  for (const cell of getPlayerCells(state)) {
    if ((Number(coreMask[cell.idx]) | 0) === 1) continue;
    let adjacentToCore = false;
    for (let dy = -1; dy <= 1 && !adjacentToCore; dy += 1) {
      for (let dx = -1; dx <= 1 && !adjacentToCore; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if ((Number(coreMask[y * w + x]) | 0) === 1) adjacentToCore = true;
      }
    }
    if (!adjacentToCore) continue;
    out.push({ x: cell.x, y: cell.y });
    if (out.length >= count) return out;
  }
  return out;
}

function commitDnaZoneFlow(store) {
  const presetId = String(store.getState().meta.worldPresetId || "river_delta");
  const growthRounds = presetId === "dry_basin" ? 4 : 3;
  growPlayerCells(store, growthRounds);
  const unlocked = waitForZoneUnlockProgress(store, 1, 32);
  assert(Number(unlocked.sim.zoneUnlockProgress || 0) >= 1, "zone unlock progress not reached");
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  const inSetup = store.getState();
  assert(inSetup.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "dna setup not entered");
  const cells = pickDnaCells(inSetup, 4);
  assert(cells.length === 4, "not enough valid dna-zone cells");
  for (const cell of cells) {
    store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });
}

function waitForInfraResources(store, minDna = 60, minEnergy = 20, maxSteps = 120) {
  const dnaTarget = Number(minDna);
  const energyTarget = Number(minEnergy);
  const steps = Math.max(1, Number(maxSteps || 1) | 0);
  for (let i = 0; i < steps; i += 1) {
    const state = store.getState();
    if (state.sim.runPhase !== RUN_PHASE.RUN_ACTIVE) return state;
    if (
      Number(state.sim.playerDNA || 0) >= dnaTarget
      && Number(state.sim.playerEnergyStored || 0) >= energyTarget
    ) return state;
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }
  return store.getState();
}

function hasAdjacentRole4(state, idx, roles) {
  const w = state.world.w;
  const h = state.world.h;
  const x = idx % w;
  const y = (idx / w) | 0;
  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    const nIdx = ny * w + nx;
    const role = Number(state.world.zoneRole[nIdx] || 0) | 0;
    if (roles.includes(role)) return true;
  }
  return false;
}

function isEligibleInfraTile(state, idx) {
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  if ((Number(state.world.alive[idx]) | 0) !== 1) return false;
  if ((Number(state.world.lineageId[idx]) | 0) !== playerLineageId) return false;
  if ((Number(state.world.link[idx]) | 0) > 0) return false;
  const role = Number(state.world.zoneRole[idx] || 0) | 0;
  if (role === ZONE_ROLE.CORE || role === ZONE_ROLE.DNA || role === ZONE_ROLE.INFRA) return false;
  return true;
}

function buildAdjacentChain(state, minCount = 3) {
  const forbiddenRoles = [ZONE_ROLE.CORE, ZONE_ROLE.DNA, ZONE_ROLE.INFRA];
  const toCell = (idx) => ({ x: idx % state.world.w, y: (idx / state.world.w) | 0, idx });
  const isAdj4 = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
  const candidates = [];
  for (let i = 0; i < state.world.alive.length; i += 1) {
    if (!isEligibleInfraTile(state, i)) continue;
    candidates.push(toCell(i));
  }
  const first = candidates.find((cell) => hasAdjacentRole4(state, cell.idx, forbiddenRoles));
  if (!first) return [];
  const chain = [first];
  while (chain.length < minCount) {
    const prev = chain[chain.length - 1];
    const next = candidates.find((cell) => (
      !chain.some((entry) => entry.idx === cell.idx)
      && isAdj4(cell, prev)
    ));
    if (!next) break;
    chain.push(next);
  }
  return chain;
}

function createFullPhaseERun(seed, presetId = "dry_basin") {
  const store = createGenesisStore(seed, presetId);
  placeFoundersAndConfirmCore(store);
  commitDnaZoneFlow(store);
  const ready = waitForInfraResources(store, 60, 20, 120);
  assert(Number(ready.sim.playerDNA || 0) >= 60, "infra prep dna not reached");
  assert(Number(ready.sim.playerEnergyStored || 0) >= 20, "infra prep energy not reached");

  const infraCells = buildAdjacentChain(ready, 3);
  assert(infraCells.length >= 3, "infra chain missing in natural flow");
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
  if (
    (Number(stateA.world.coreZoneMask[i]) | 0) === 1
    && (Number(stateA.world.alive[i]) | 0) === 1
  ) {
    assert((Number(stateA.world.zoneRole[i]) | 0) === ZONE_ROLE.CORE, `core zone drift at idx=${i}`);
  }
  if (
    (Number(stateA.world.dnaZoneMask[i]) | 0) === 1
    && (Number(stateA.world.alive[i]) | 0) === 1
    && (Number(stateA.world.coreZoneMask[i]) | 0) === 0
  ) {
    assert((Number(stateA.world.zoneRole[i]) | 0) === ZONE_ROLE.DNA, `dna zone drift at idx=${i}`);
  }
}

console.log("PHASE_E_INTEGRITY_OK canonical zones and deterministic pattern state verified");

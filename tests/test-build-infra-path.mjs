import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-build-infra-path.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE, ZONE_ROLE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  assert(
    Number(unlocked.sim.zoneUnlockProgress || 0) >= 1,
    `zone unlock progress not reached in standard flow (preset=${presetId}, progress=${unlocked.sim.zoneUnlockProgress})`,
  );
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  const inSetup = store.getState();
  assert(inSetup.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "dna setup not entered");
  const cells = pickDnaCells(inSetup, 4);
  assert(cells.length === 4, "not enough valid dna-zone cells in standard flow");
  for (const cell of cells) {
    store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });
}

function waitForInfraResources(store, minDna = 40, minEnergy = 10, maxSteps = 80) {
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

function findPlayerLineage(state) {
  return Number(state.meta.playerLineageId || 1) | 0;
}

function hasAdjacentRole4(state, idx, roles) {
  const w = state.world.w;
  const h = state.world.h;
  const x = idx % w;
  const y = (idx / w) | 0;
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
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
  const playerLineageId = findPlayerLineage(state);
  if ((Number(state.world.alive[idx]) | 0) !== 1) return false;
  if ((Number(state.world.lineageId[idx]) | 0) !== playerLineageId) return false;
  if ((Number(state.world.link[idx]) | 0) > 0) return false;
  const role = Number(state.world.zoneRole[idx] || 0) | 0;
  if (role === ZONE_ROLE.CORE || role === ZONE_ROLE.DNA || role === ZONE_ROLE.INFRA) return false;
  return true;
}

function buildAdjacentChain(state) {
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
  const second = candidates.find((cell) => cell.idx !== first.idx && isAdj4(cell, first));
  if (!second) return [first];
  const third = candidates.find((cell) => (
    cell.idx !== first.idx
    && cell.idx !== second.idx
    && isAdj4(cell, second)
  ));
  return third ? [first, second, third] : [first, second];
}

function findFarNonAdjacentPlayerCell(state, chain) {
  const protectedSet = new Set(chain.map((cell) => cell.idx));
  for (let i = 0; i < state.world.alive.length; i += 1) {
    if (protectedSet.has(i)) continue;
    if (!isEligibleInfraTile(state, i)) continue;
    const cell = { x: i % state.world.w, y: (i / state.world.w) | 0 };
    const adjacentToChain = chain.some((anchor) => Math.abs(anchor.x - cell.x) + Math.abs(anchor.y - cell.y) === 1);
    if (adjacentToChain) continue;
    if (hasAdjacentRole4(state, i, [ZONE_ROLE.CORE, ZONE_ROLE.DNA, ZONE_ROLE.INFRA])) continue;
    return cell;
  }
  return null;
}

const store = createGenesisStore("build-infra-path-1", "dry_basin");
placeFoundersAndConfirmCore(store);
commitDnaZoneFlow(store);
const ready = waitForInfraResources(store, 40, 10, 80);
assert(ready.sim.runPhase === "run_active", "infra path test requires active run");
store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
const inBuild = store.getState();
assert(inBuild.sim.infraBuildMode === "path", "infra build mode not entered");

const chain = buildAdjacentChain(inBuild);
assert(chain.length >= 3, "infra chain candidates missing in standard flow");
const farCell = findFarNonAdjacentPlayerCell(inBuild, chain);
assert(!!farCell, "far non-adjacent player cell missing");

const before = store.getSignature();
store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...farCell, remove: false } });
assert(store.getSignature() === before, "non-adjacent infra path tile must stay blocked");

for (let i = 0; i < chain.length; i += 1) {
  store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...chain[i], remove: false } });
  const next = store.getState();
  const idx = chain[i].y * next.world.w + chain[i].x;
  assert(Number(next.world.infraCandidateMask[idx] || 0) === 1, `infra candidate tile ${i} missing`);
}

store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...chain[2], remove: true } });
const afterRemove = store.getState();
const removedIdx = chain[2].y * afterRemove.world.w + chain[2].x;
assert(Number(afterRemove.world.infraCandidateMask[removedIdx] || 0) === 0, "infra candidate removal must clear staged tile");

console.log("BUILD_INFRA_PATH_OK semantic path staging verified");

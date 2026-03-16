import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-toggle-dna-zone-cell.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createActiveCoreStore(seed, presetId = "river_delta") {
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
  return store;
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
    out.push({ x: cell.x, y: cell.y, idx: cell.idx });
    if (out.length >= count) return out;
  }
  return out;
}

function findFarNonAdjacentOwnedCell(state, anchorCells) {
  const w = state.world.w;
  const h = state.world.h;
  const anchorSet = new Set(anchorCells.map((cell) => `${cell.x},${cell.y}`));
  for (const cell of getPlayerCells(state)) {
    if (anchorSet.has(`${cell.x},${cell.y}`)) continue;
    const nearAnchor = anchorCells.some((a) => Math.max(Math.abs(a.x - cell.x), Math.abs(a.y - cell.y)) <= 1);
    if (nearAnchor) continue;
    if (cell.x < 0 || cell.y < 0 || cell.x >= w || cell.y >= h) continue;
    return { x: cell.x, y: cell.y };
  }
  return null;
}

function findAdjacentUnselectedOwnedCell(state, anchorCells) {
  const selected = new Set(anchorCells.map((cell) => `${cell.x},${cell.y}`));
  for (const cell of getPlayerCells(state)) {
    if (selected.has(`${cell.x},${cell.y}`)) continue;
    const adjacent = anchorCells.some((a) => Math.max(Math.abs(a.x - cell.x), Math.abs(a.y - cell.y)) <= 1);
    if (!adjacent) continue;
    return { x: cell.x, y: cell.y };
  }
  return null;
}

const store = createActiveCoreStore("toggle-dna-zone-cell-1");
growPlayerCells(store, 4);
const activeState = waitForZoneUnlockProgress(store, 1, 32);
assert(activeState.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "test requires active run before dna setup");
assert(Number(activeState.sim.zoneUnlockProgress || 0) >= 1, "test requires naturally reached unlock progress");

const coreIndices = [];
for (let i = 0; i < activeState.world.coreZoneMask.length; i++) {
  if ((Number(activeState.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
}
const coreXY = coreIndices.map((idx) => ({ x: idx % activeState.world.w, y: (idx / activeState.world.w) | 0 }));
const minX = Math.min(...coreXY.map((pos) => pos.x));
const maxX = Math.max(...coreXY.map((pos) => pos.x));
const minY = Math.min(...coreXY.map((pos) => pos.y));
const maxY = Math.max(...coreXY.map((pos) => pos.y));

const validCells = pickDnaCells(activeState, 4);
assert(validCells.length === 4, "missing 4 valid dna cells in natural flow");
const blockedFar = findFarNonAdjacentOwnedCell(activeState, validCells);
assert(!!blockedFar, "missing far non-adjacent owned cell");
store.dispatch({ type: "START_DNA_ZONE_SETUP" });
const state = store.getState();
assert(state.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "test requires dna zone setup");

// overlap with core is forbidden.
{
  const before = store.getSignature();
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { x: minX, y: minY, remove: false } });
  assert(store.getSignature() === before, "core-overlap dna placement must stay blocked");
}

// non-adjacent owned cell is forbidden.
{
  const before = store.getSignature();
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...blockedFar, remove: false } });
  assert(store.getSignature() === before, "non-adjacent dna placement must stay blocked");
}

// valid chain placement consumes budget down to zero, fifth add is blocked.
for (let i = 0; i < validCells.length; i++) {
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...validCells[i], remove: false } });
  const next = store.getState();
  assert(Number(next.world.dnaZoneMask[validCells[i].y * next.world.w + validCells[i].x] || 0) === 1, `dna placement ${i} missing`);
  assert(next.sim.zone2PlacementBudget === 3 - i, `dna placement budget drift after add ${i}`);
}
{
  const zeroBudgetState = store.getState();
  const budgetBlockedCell = findAdjacentUnselectedOwnedCell(zeroBudgetState, validCells);
  assert(!!budgetBlockedCell, "missing adjacent unselected owned cell for zero-budget gate");
  const before = store.getSignature();
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...budgetBlockedCell, remove: false } });
  assert(store.getSignature() === before, "fifth dna placement must stay blocked at zero budget");
}

// removal before confirm is allowed and restores budget.
{
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...validCells[3], remove: true } });
  const after = store.getState();
  const idx = validCells[3].y * after.world.w + validCells[3].x;
  assert(Number(after.world.dnaZoneMask[idx] || 0) === 0, "dna removal must clear the selected tile");
  assert(after.sim.zone2PlacementBudget === 1, "dna removal must restore one budget slot");
}

console.log("TOGGLE_DNA_ZONE_CELL_OK ownership adjacency budget and removal verified");

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-start-dna-zone-setup.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
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

// blocked while the DNA meter is not yet full.
{
  const store = createActiveCoreStore("start-dna-zone-setup-blocked-1");
  const before = store.getState();
  assert(before.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "blocked case requires active run");
  assert(Number(before.sim.zoneUnlockProgress || 0) < 1, "blocked case expects incomplete dna meter");
  const sigBefore = store.getSignature();
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  assert(store.getSignature() === sigBefore, "dna zone setup must stay blocked before meter is full");
}

// success path: full meter moves RUN_ACTIVE -> DNA_ZONE_SETUP and allocates preset budget.
{
  const store = createActiveCoreStore("start-dna-zone-setup-success-1", "wet_meadow");
  growPlayerCells(store, 3);
  const before = waitForZoneUnlockProgress(store, 1, 32);
  const tileCount = before.world.w * before.world.h;
  assert(Number(before.sim.zoneUnlockProgress || 0) >= 1, "setup success requires naturally reached unlock progress");
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "start dna zone setup must enter DNA_ZONE_SETUP");
  assert(after.sim.running === false, "dna zone setup must pause the run");
  assert(after.sim.zone2Unlocked === true, "dna zone setup must mark zone2 unlocked");
  assert(after.sim.zone2PlacementBudget === 4, "dna zone setup must read preset placement budget");
  assert(after.world.dnaZoneMask.length === tileCount, "dna zone mask length drift");
  assert(after.world.dnaZoneMask.every((value) => (Number(value) | 0) === 0), "dna zone mask must be reset empty on setup start");
}

// wrong mode/phase remains blocked.
{
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: "start-dna-zone-setup-lab-1" });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  const sigBefore = store.getSignature();
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  assert(store.getSignature() === sigBefore, "dna zone setup must be blocked in lab mode");
}

// repeated start is no-op once setup is already active.
{
  const store = createActiveCoreStore("start-dna-zone-setup-repeat-1");
  growPlayerCells(store, 3);
  const unlocked = waitForZoneUnlockProgress(store, 1, 32);
  assert(Number(unlocked.sim.zoneUnlockProgress || 0) >= 1, "repeat case requires naturally reached unlock progress");
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  const sigAfterFirst = store.getSignature();
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  assert(store.getSignature() === sigAfterFirst, "dna zone setup must not re-enter once already active");
}

console.log("START_DNA_ZONE_SETUP_OK meter gate and setup transition verified");

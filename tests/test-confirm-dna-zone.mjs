import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-confirm-dna-zone.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE, ZONE_ROLE } from "../src/game/contracts/ids.js";
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

function createPreparedDnaSetupStore(seed, presetId = "river_delta") {
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
  growPlayerCells(store, presetId === "dry_basin" ? 4 : 3);
  const active = waitForZoneUnlockProgress(store, 1, 32);
  assert(Number(active.sim.zoneUnlockProgress || 0) >= 1, "dna setup preparation requires natural unlock progress");
  const validCells = pickDnaCells(active, 4);
  assert(validCells.length === 4, "dna setup preparation needs 4 valid cells");
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  return { store, validCells };
}

// partial setup must stay blocked.
{
  const { store, validCells } = createPreparedDnaSetupStore("confirm-dna-zone-blocked-1");
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...validCells[0], remove: false } });
  const sigBefore = store.getSignature();
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });
  assert(store.getSignature() === sigBefore, "partial dna zone must not confirm");
}

// full valid setup commits and returns to RUN_ACTIVE.
{
  const { store, validCells } = createPreparedDnaSetupStore("confirm-dna-zone-success-1", "dry_basin");
  for (const cell of validCells) {
    store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
  }
  const before = store.getState();
  assert(before.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "confirm dna zone requires setup phase");
  assert(before.sim.zone2PlacementBudget === 0, "confirm dna zone success expects full budget consumption");
  store.dispatch({ type: "CONFIRM_DNA_ZONE" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "confirm dna zone must return to run active");
  assert(after.sim.running === true, "confirm dna zone must restart the run");
  assert(after.sim.dnaZoneCommitted === true, "confirm dna zone must mark committed");
  assert(after.sim.unlockedZoneTier === 2, "confirm dna zone must unlock tier 2");
  assert(after.sim.nextZoneUnlockKind === "INFRA", "confirm dna zone must point to infra next");
  assert(after.sim.nextZoneUnlockCostEnergy === 0, "confirm dna zone must clear old energy unlock cost");
  assert(after.sim.zoneUnlockProgress === 0, "confirm dna zone must clear old dna meter");
  assert(after.sim.coreEnergyStableTicks === 0, "confirm dna zone must reset old stable ticks");
  assert(after.sim.nextInfraUnlockCostDNA === 30, "confirm dna zone must read preset infra cost");
  assert(Object.keys(after.world.zoneMeta || {}).length >= 2, "confirm dna zone must populate canonical zoneMeta");
  for (const cell of validCells) {
    const idx = cell.y * after.world.w + cell.x;
    assert(Number(after.world.dnaZoneMask[idx] || 0) === 1, "confirm dna zone must preserve committed mask");
    assert(Number(after.world.zoneRole[idx] || 0) === ZONE_ROLE.DNA, "confirm dna zone must stamp canonical dna role");
    assert(Number(after.world.zoneId[idx] || 0) > 0, "confirm dna zone must stamp canonical dna zoneId");
  }
  const dnaBeforeTick = Number(after.sim.playerDNA || 0);
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  const afterTick = store.getState();
  assert(Number(afterTick.sim.playerDNA || 0) > dnaBeforeTick, "committed dna zone must generate deterministic dna on sim step");
}

console.log("CONFIRM_DNA_ZONE_OK validation and commit path verified");

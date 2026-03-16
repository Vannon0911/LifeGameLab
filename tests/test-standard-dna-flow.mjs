import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-standard-dna-flow.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
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
  return { state: store.getState(), dnaCells: cells };
}

const store = createGenesisStore("standard-dna-flow-1");
placeFoundersAndConfirmCore(store);

const { state: afterCommit } = commitDnaZoneFlow(store);
assert(afterCommit.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "dna flow must return to active run");
assert(afterCommit.sim.dnaZoneCommitted === true, "dna flow must commit dna zone");
assert(afterCommit.sim.unlockedZoneTier === 2, "dna flow must unlock tier 2");
assert(afterCommit.sim.nextZoneUnlockKind === "INFRA", "dna flow must point to infra next");
assert(afterCommit.sim.running === true, "dna flow must restart after dna confirm");

console.log("STANDARD_DNA_FLOW_OK standard flow reaches dna setup and returns to active run");

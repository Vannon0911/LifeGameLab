import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-visibility-fog.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function indexOfCell(world, cell) {
  return cell.y * world.w + cell.x;
}

function createGenesisStore(seed, presetId = "dry_basin") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  if (presetId !== "dry_basin") {
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
  growPlayerCells(store, 4);
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

function waitForInfraResources(store, minDna = 38, minEnergy = 10, maxSteps = 240) {
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
    if (Number(state.sim.playerDNA || 0) < dnaTarget) {
      growPlayerCells(store, 1);
      const afterGrow = store.getState();
      const harvestCandidates = getPlayerCells(afterGrow).filter((cell) => (
        (Number(afterGrow.world.coreZoneMask[cell.idx]) | 0) === 0
      ));
      const harvestCount = Math.min(4, harvestCandidates.length);
      for (let j = 0; j < harvestCount; j += 1) {
        const cell = harvestCandidates[j];
        store.dispatch({ type: "HARVEST_CELL", payload: { x: cell.x, y: cell.y } });
      }
    }
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }
  return store.getState();
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

function harvestAllPlayerCells(store, maxOps = 2048) {
  let ops = 0;
  while (ops < maxOps) {
    const state = store.getState();
    const cells = getPlayerCells(state);
    if (!cells.length) return store.getState();
    const target = cells[0];
    store.dispatch({ type: "HARVEST_CELL", payload: { x: target.x, y: target.y } });
    ops += 1;
  }
  return store.getState();
}

const coreStore = createGenesisStore("visibility-fog-seed-1", "dry_basin");
placeFoundersAndConfirmCore(coreStore);
const afterCore = runStep(coreStore);
assertMaskEquals(afterCore.world.visibility, deriveExpectedVisibility(afterCore), "core visibility");

const coreIndices = [];
for (let i = 0; i < afterCore.world.coreZoneMask.length; i++) {
  if ((Number(afterCore.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
}
const coreXY = coreIndices.map((idx) => ({ x: idx % afterCore.world.w, y: (idx / afterCore.world.w) | 0 }));
const minX = Math.min(...coreXY.map((pos) => pos.x));
const minY = Math.min(...coreXY.map((pos) => pos.y));

const coreVisibleCell = { x: minX + 2, y: minY };
assert(Number(afterCore.world.visibility[indexOfCell(afterCore.world, coreVisibleCell)] || 0) === 1, "core radius must reveal nearby tiles");

const store = createGenesisStore("visibility-fog-seed-1", "dry_basin");
placeFoundersAndConfirmCore(store);
commitDnaZoneFlow(store);
const afterDna = runStep(store);
assertMaskEquals(afterDna.world.visibility, deriveExpectedVisibility(afterDna), "dna visibility");

let dnaDeltaIdx = -1;
for (let i = 0; i < afterDna.world.visibility.length; i += 1) {
  if ((Number(afterDna.world.visibility[i]) | 0) === 1) {
    dnaDeltaIdx = i;
    break;
  }
}
assert(dnaDeltaIdx >= 0, "dna commit must produce visible tiles");

harvestAllPlayerCells(store, 2048);
const afterLossOfSight = runStep(store);
const priorVisibleIdx = dnaDeltaIdx;
assert(Number(afterDna.world.explored[priorVisibleIdx] || 0) === 1, "visible dna tile must be marked explored");
assert(Number(afterLossOfSight.world.visibility[priorVisibleIdx] || 0) === 0, "hidden tile must become non-visible again");
assert(Number(afterLossOfSight.world.explored[priorVisibleIdx] || 0) === 1, "explored must remain filled after vision disappears");

const neverSeenCell = { x: afterLossOfSight.world.w - 1, y: 0 };
const neverSeenIdx = indexOfCell(afterLossOfSight.world, neverSeenCell);
assert(Number(afterLossOfSight.world.visibility[neverSeenIdx] || 0) === 0, "distant unseen tile must remain hidden");
assert(Number(afterLossOfSight.world.explored[neverSeenIdx] || 0) === 0, "distant unseen tile must remain unexplored");

console.log("VISIBILITY_FOG_OK core/dna vision and explored persistence verified");

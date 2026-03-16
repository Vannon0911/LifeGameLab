import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-standard-infra-flow.mjs");

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
  return { state: store.getState(), dnaCells: cells };
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

function countMask(mask) {
  let total = 0;
  for (let i = 0; i < (mask?.length || 0); i += 1) {
    total += (Number(mask[i] || 0) | 0) === 1 ? 1 : 0;
  }
  return total;
}

function findZoneMetaEntry(zoneMeta, zoneId) {
  if (!zoneMeta || typeof zoneMeta !== "object") return null;
  const direct = zoneMeta[zoneId] ?? zoneMeta[String(zoneId)];
  if (direct && typeof direct === "object") return direct;
  return Object.values(zoneMeta).find((entry) => (
    entry
    && typeof entry === "object"
    && Number(entry.zoneId ?? entry.id ?? -1) === Number(zoneId)
  )) || null;
}

const store = createGenesisStore("standard-infra-flow-1", "dry_basin");
placeFoundersAndConfirmCore(store);

commitDnaZoneFlow(store);
let ready = waitForInfraResources(store, 40, 10, 80);
assert(ready.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "run must stay active before infra setup");
assert(Number(ready.sim.playerDNA || 0) >= 40, `insufficient DNA before infra: ${ready.sim.playerDNA}`);
assert(Number(ready.sim.playerEnergyStored || 0) >= 10, `insufficient energy before infra: ${ready.sim.playerEnergyStored}`);

const w = ready.world.w;
const h = ready.world.h;
const playerLineageId = Number(ready.meta.playerLineageId || 1) | 0;
const coreTiles = [];
for (let i = 0; i < ready.world.coreZoneMask.length; i += 1) {
  if ((Number(ready.world.coreZoneMask[i]) | 0) !== 1) continue;
  coreTiles.push({ x: i % w, y: (i / w) | 0 });
}
assert(coreTiles.length === 4, "expected canonical core footprint");

const maxX = Math.max(...coreTiles.map((tile) => tile.x));
const minY = Math.min(...coreTiles.map((tile) => tile.y));
const infraPath = [
  { x: maxX, y: minY },
  { x: maxX + 1, y: minY },
  { x: maxX + 2, y: minY },
  { x: maxX + 3, y: minY },
].filter((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < w && cell.y < h);

for (const cell of infraPath) {
  store.dispatch({ type: "PLACE_CELL", payload: { ...cell, remove: false } });
}

const beforeInfra = store.getState();
const visibleBefore = countMask(beforeInfra.world.visibility);
const exploredBefore = countMask(beforeInfra.world.explored);

store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
for (const cell of infraPath) {
  store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...cell, remove: false } });
}
store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
const afterCommit = store.getState();

assert(afterCommit.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "infra flow must stay in active run");
assert(afterCommit.sim.running === true, "infra flow must resume after confirm");
assert(afterCommit.sim.infrastructureUnlocked === true, "infra flow must unlock infrastructure");

store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const afterInfraStep = store.getState();
const visibleAfter = countMask(afterInfraStep.world.visibility);
const exploredAfter = countMask(afterInfraStep.world.explored);
assert(visibleAfter > visibleBefore, `infra visibility must expand after commit (${visibleBefore} -> ${visibleAfter})`);
assert(exploredAfter >= exploredBefore, "explored must stay monotonic after infra sight");

const infraZoneIds = new Set();
for (const cell of infraPath) {
  const idx = cell.y * afterInfraStep.world.w + cell.x;
  if ((Number(afterInfraStep.world.link[idx] || 0) | 0) !== 1) continue;
  if ((Number(afterInfraStep.world.coreZoneMask[idx] || 0) | 0) === 1) continue;
  if ((Number(afterInfraStep.world.dnaZoneMask[idx] || 0) | 0) === 1) continue;
  assert((Number(afterInfraStep.world.zoneRole?.[idx]) | 0) === ZONE_ROLE.INFRA, `infra role mirror drift at idx=${idx}`);
  assert((Number(afterInfraStep.world.lineageId?.[idx]) | 0) === playerLineageId, `infra ownership drift at idx=${idx}`);
  const zoneId = Number(afterInfraStep.world.zoneId?.[idx] || 0) | 0;
  assert(zoneId > 0, `infra zoneId missing at idx=${idx}`);
  infraZoneIds.add(zoneId);
}
assert(infraZoneIds.size >= 1, "infra zoneId mirror missing for committed non-core corridor");

for (const zoneId of infraZoneIds) {
  const meta = findZoneMetaEntry(afterInfraStep.world.zoneMeta, zoneId);
  assert(meta, `infra zoneMeta missing for zoneId=${zoneId}`);
  const role = meta.role ?? meta.zoneRole ?? meta.kind ?? "";
  assert(
    role === ZONE_ROLE.INFRA || String(role).toLowerCase() === "infra",
    `infra zoneMeta role drift for zoneId=${zoneId}: ${String(role)}`,
  );
}

console.log("STANDARD_INFRA_FLOW_OK standard flow reaches infra commit, expands sight, and preserves explored memory");

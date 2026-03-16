import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-confirm-infra-path.mjs");

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

function waitForInfraResources(store, minDna = 45, minEnergy = 12, maxSteps = 140) {
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

function findFarNonAdjacentPlayerCell(state, anchors) {
  const anchorSet = new Set(anchors.map((cell) => `${cell.x},${cell.y}`));
  for (const cell of getPlayerCells(state)) {
    if (anchorSet.has(`${cell.x},${cell.y}`)) continue;
    const adjacent = anchors.some((a) => Math.max(Math.abs(a.x - cell.x), Math.abs(a.y - cell.y)) <= 1);
    if (!adjacent) return { x: cell.x, y: cell.y };
  }
  return null;
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

function buildAdjacentChain(state, minCount = 2) {
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

function createInfraCommitStore(seed, presetId = "dry_basin") {
  const store = createGenesisStore(seed, presetId);
  placeFoundersAndConfirmCore(store);
  commitDnaZoneFlow(store);
  const ready = waitForInfraResources(store, 45, 12, 140);
  assert(Number(ready.sim.playerDNA || 0) >= 45, "infra prep dna not reached");
  assert(Number(ready.sim.playerEnergyStored || 0) >= 12, "infra prep energy not reached");

  const beforeBuild = store.getState();
  const pathCells = buildAdjacentChain(beforeBuild, 2);
  assert(pathCells.length >= 2, "valid infra candidate chain missing in natural flow");
  const farCell = findFarNonAdjacentPlayerCell(beforeBuild, pathCells);
  assert(!!farCell, "far non-adjacent candidate missing");

  store.dispatch({ type: "BEGIN_INFRA_BUILD", payload: {} });
  return { store, pathCells, farCell };
}

function assertFloatArrayEqual(a, b, msg) {
  assert(a.length === b.length, `${msg}: length mismatch`);
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(Number(a[i] || 0) - Number(b[i] || 0)) > 1e-9) {
      throw new Error(`${msg}: mismatch at ${i}`);
    }
  }
}

{
  const { store } = createInfraCommitStore("confirm-infra-path-abort-1");
  const before = store.getState();
  const linkBefore = new Float32Array(before.world.link);
  const energyBefore = new Float32Array(before.world.E);
  const dnaBefore = Number(before.sim.playerDNA || 0);
  const storedEnergyBefore = Number(before.sim.playerEnergyStored || 0);
  assert(before.sim.infraBuildMode === "path", "empty confirm requires path mode");
  assert(before.sim.running === false, "begin infra build must pause run before abort");
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  const blockedResume = store.getState();
  assert(blockedResume.sim.running === false, "manual resume must stay blocked while infra build mode is active");
  store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "empty confirm abort must stay in active run phase");
  assert(after.sim.running === true, "empty confirm abort must restart the run");
  assert(after.sim.infraBuildMode === "", "empty confirm abort must leave build mode");
  assert(after.sim.infrastructureUnlocked === false, "empty confirm abort must not unlock infrastructure");
  assert(Number(after.sim.playerDNA || 0) === dnaBefore, "empty confirm abort must not spend dna");
  assert(Number(after.sim.playerEnergyStored || 0) === storedEnergyBefore, "empty confirm abort must not spend stored energy");
  assertFloatArrayEqual(after.world.link, linkBefore, "empty confirm abort must leave world.link unchanged");
  assertFloatArrayEqual(after.world.E, energyBefore, "empty confirm abort must leave world.E unchanged");
  assert(after.world.infraCandidateMask.every((value) => (Number(value || 0) | 0) === 0), "empty confirm abort must keep candidate mask empty");
}

{
  const { store, pathCells, farCell } = createInfraCommitStore("confirm-infra-path-invalid-1");
  const invalidState = store.getState();
  const candidateMask = new Uint8Array(invalidState.world.infraCandidateMask);
  const anchorIdx = pathCells[0].y * invalidState.world.w + pathCells[0].x;
  const farIdx = farCell.y * invalidState.world.w + farCell.x;
  candidateMask[anchorIdx] = 1;
  candidateMask[farIdx] = 1;
  const tamperedState = {
    ...invalidState,
    world: {
      ...invalidState.world,
      infraCandidateMask: candidateMask,
    },
  };
  const patches = reducer(tamperedState, { type: "CONFIRM_INFRA_PATH", payload: {} }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "invalid non-empty staged infra path must stay blocked");
}

{
  const { store, pathCells } = createInfraCommitStore("confirm-infra-path-success-1");
  for (const cell of pathCells) {
    store.dispatch({ type: "BUILD_INFRA_PATH", payload: { ...cell, remove: false } });
  }
  const before = store.getState();
  const dnaBefore = Number(before.sim.playerDNA || 0);
  const energyBefore = Number(before.sim.playerEnergyStored || 0);
  assert(before.sim.infraBuildMode === "path", "infra confirm requires path mode");
  store.dispatch({ type: "CONFIRM_INFRA_PATH", payload: {} });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "infra confirm must stay in active run phase");
  assert(after.sim.running === true, "infra confirm must restart the run");
  assert(after.sim.infrastructureUnlocked === true, "infra confirm must unlock infrastructure");
  assert(after.sim.infraBuildMode === "", "infra confirm must leave build mode");
  assert(Number(after.sim.playerDNA || 0) === dnaBefore - 38, "infra confirm must spend unlock dna plus build dna");
  assert(Math.round(Number(after.sim.playerEnergyStored || 0) * 1000) === Math.round((energyBefore - 10) * 1000), "infra confirm must spend stored energy");
  assert(Object.keys(after.world.zoneMeta || {}).length >= 3, "infra confirm must populate canonical zoneMeta");
  for (const cell of pathCells) {
    const idx = cell.y * after.world.w + cell.x;
    assert(Number(after.world.link[idx] || 0) > 0, "infra confirm must commit staged path to world.link");
    assert(Number(after.world.infraCandidateMask[idx] || 0) === 0, "infra confirm must clear staged candidate path");
    assert(Number(after.world.zoneRole[idx] || 0) === ZONE_ROLE.INFRA || Number(after.world.zoneRole[idx] || 0) === ZONE_ROLE.CORE, "infra confirm must stamp canonical infra/core role");
    assert(Number(after.world.zoneId[idx] || 0) > 0, "infra confirm must stamp canonical zoneId");
  }
}

console.log("CONFIRM_INFRA_PATH_OK abort, invalid, and commit paths verified");

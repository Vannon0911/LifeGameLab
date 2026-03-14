import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-standard-infra-flow.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
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
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/world/alive", value: alive },
        { op: "set", path: "/world/lineageId", value: lineageId },
      ],
    },
  });
}

function patchPlayerEnergy(store, energyPerCell = 6, dna = 80) {
  const state = store.getState();
  const E = new Float32Array(state.world.E);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  let ownedAlive = 0;
  for (let i = 0; i < E.length; i += 1) {
    if ((Number(state.world.alive[i]) | 0) !== 1) continue;
    if ((Number(state.world.lineageId[i]) | 0) !== playerLineageId) continue;
    E[i] = energyPerCell;
    ownedAlive += 1;
  }
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/world/E", value: E },
        { op: "set", path: "/sim/playerEnergyStored", value: energyPerCell * ownedAlive },
        { op: "set", path: "/sim/playerDNA", value: dna },
      ],
    },
  });
}

function countMask(mask) {
  let total = 0;
  for (let i = 0; i < (mask?.length || 0); i += 1) {
    total += (Number(mask[i] || 0) | 0) === 1 ? 1 : 0;
  }
  return total;
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "standard-infra-flow-1" });
store.dispatch({ type: "GEN_WORLD" });
store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });

const start = store.getState();
const preset = getWorldPreset(start.meta.worldPresetId);
const range = getStartWindowRange(preset.startWindows.player, start.world.w, start.world.h);
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
store.dispatch({
  type: "APPLY_BUFFERED_SIM_STEP",
  payload: { patches: [{ op: "set", path: "/sim/zoneUnlockProgress", value: 1 }] },
});

const active = store.getState();
const coreIndices = [];
for (let i = 0; i < active.world.coreZoneMask.length; i += 1) {
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
for (const cell of dnaCells) {
  store.dispatch({ type: "TOGGLE_DNA_ZONE_CELL", payload: { ...cell, remove: false } });
}
store.dispatch({ type: "CONFIRM_DNA_ZONE" });
store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const beforeInfra = store.getState();
const visibleBefore = countMask(beforeInfra.world.visibility);
const exploredBefore = countMask(beforeInfra.world.explored);

const infraPath = [
  { x: maxX, y: minY },
  { x: maxX + 1, y: minY },
  { x: maxX + 2, y: minY },
  { x: maxX + 3, y: minY },
];
patchPlayerCells(store, infraPath);
patchPlayerEnergy(store, 6, 80);

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

patchPlayerCells(store, [
  { ...infraPath[2], alive: 0 },
  { ...infraPath[3], alive: 0 },
]);
store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const afterLoss = store.getState();
const visibleAfterLoss = countMask(afterLoss.world.visibility);
const exploredAfterLoss = countMask(afterLoss.world.explored);
assert(visibleAfterLoss < visibleAfter, `visibility should shrink after losing infra path (${visibleAfter} -> ${visibleAfterLoss})`);
assert(exploredAfterLoss >= exploredAfter, `explored memory must persist after sight loss (${exploredAfter} -> ${exploredAfterLoss})`);

console.log("STANDARD_INFRA_FLOW_OK standard flow reaches infra commit, expands sight, and preserves explored memory");

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-split-security-gate.mjs");
import { createStore } from "../src/core/kernel/store.js";
import { applyPatches } from "../src/core/kernel/patches.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import { deriveCommandScore } from "../src/game/techTree.js";
import {
  handleBuyEvolution,
  handlePlaceCell,
  handlePlaceSplitCluster,
  handleSetZone,
} from "../src/game/sim/playerActions.js";
import { DEV_MUTATION_CATALOG } from "../src/game/sim/reducer/techTreeOps.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function mkStore(seed = "split-security") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  return store;
}

function firstPlayerCells(state, count) {
  const out = [];
  const pLid = state.meta.playerLineageId;
  for (let i = 0; i < state.world.alive.length && out.length < count; i++) {
    if (state.world.alive[i] === 1 && (Number(state.world.lineageId[i]) | 0) === pLid) {
      out.push({ idx: i, x: i % state.world.w, y: Math.floor(i / state.world.w) });
    }
  }
  return out;
}

function stepFor(store, ticks) {
  for (let i = 0; i < ticks; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  return store.getState();
}

function earnDNA(store, minimum) {
  let state = store.getState();
  let guard = 0;
  while (Number(state.sim.playerDNA || 0) < minimum && guard < 48) {
    const targets = firstPlayerCells(state, 1);
    if (!targets.length) break;
    store.dispatch({ type: "HARVEST_CELL", payload: { x: targets[0].x, y: targets[0].y } });
    state = store.getState();
    guard++;
  }
  return state;
}

function findEmptyClusterOrigin(state, size = 4) {
  const { w, h, alive } = state.world;
  for (let y = 0; y <= h - size; y++) {
    for (let x = 0; x <= w - size; x++) {
      let clear = true;
      for (let yy = y; yy < y + size && clear; yy++) {
        for (let xx = x; xx < x + size; xx++) {
          if (alive[yy * w + xx] === 1) {
            clear = false;
            break;
          }
        }
      }
      if (clear) return { x, y };
    }
  }
  return null;
}

function countAliveInRegion(state, origin, size = 4) {
  let count = 0;
  for (let yy = origin.y; yy < origin.y + size; yy++) {
    for (let xx = origin.x; xx < origin.x + size; xx++) {
      if (state.world.alive[yy * state.world.w + xx] === 1) count++;
    }
  }
  return count;
}

function countZoneTiles(state, origin, zoneType, size = 4) {
  let count = 0;
  for (let yy = origin.y; yy < origin.y + size; yy++) {
    for (let xx = origin.x; xx < origin.x + size; xx++) {
      if ((state.world.zoneMap[yy * state.world.w + xx] | 0) === zoneType) count++;
    }
  }
  return count;
}

function unlockSplit(store) {
  let state = stepFor(store, 60);
  state = earnDNA(store, 5);
  assert(state.sim.playerDNA >= 5, `Not enough DNA for light_harvest: ${state.sim.playerDNA}`);
  store.dispatch({ type: "BUY_EVOLUTION", payload: { archetypeId: "light_harvest" } });
  state = store.getState();

  let guard = 0;
  while ((Number(state.sim.playerStage || 1) < 2 || Number(state.sim.playerDNA || 0) < 10) && guard < 40) {
    state = earnDNA(store, 10);
    state = stepFor(store, 2);
    guard++;
  }
  assert(Number(state.sim.playerStage || 1) >= 2, `Player stage did not reach 2: ${state.sim.playerStage}`);

  guard = 0;
  while (deriveCommandScore(state.sim) < 0.10 && guard < 80) {
    state = stepFor(store, 1);
    guard++;
  }
  state = earnDNA(store, 10);
  assert(state.sim.playerDNA >= 10, `Not enough DNA for cooperative_network: ${state.sim.playerDNA}`);
  state = applyPatches(
    {
      ...state,
      sim: {
        ...state.sim,
        patternCatalog: [{ id: "line", discovered: true }],
      },
    },
    handleBuyEvolution(
      {
        ...state,
        sim: {
          ...state.sim,
          patternCatalog: [{ id: "line", discovered: true }],
        },
      },
      { type: "BUY_EVOLUTION", payload: { archetypeId: "cooperative_network" } },
      DEV_MUTATION_CATALOG
    )
  );
  const coopLineageMemory = state.world.lineageMemory;

  state = stepFor(store, 12);
  guard = 0;
  while (deriveCommandScore(state.sim) < 0.14 && guard < 80) {
    state = stepFor(store, 1);
    guard++;
  }
  guard = 0;
  while (Number(state.sim.playerDNA || 0) < 10 && guard < 40) {
    state = earnDNA(store, 10);
    if (Number(state.sim.playerDNA || 0) >= 10) break;
    state = stepFor(store, 2);
    guard++;
  }
  assert(state.sim.playerDNA >= 10, `Not enough DNA for cluster_split: ${state.sim.playerDNA}`);
  state = applyPatches(
    {
      ...state,
      world: {
        ...state.world,
        lineageMemory: coopLineageMemory,
      },
      sim: {
        ...state.sim,
        patternCatalog: [{ id: "line", discovered: true }],
      },
    },
    handleBuyEvolution(
      {
        ...state,
        world: {
          ...state.world,
          lineageMemory: coopLineageMemory,
        },
        sim: {
          ...state.sim,
          patternCatalog: [{ id: "line", discovered: true }],
        },
      },
      { type: "BUY_EVOLUTION", payload: { archetypeId: "cluster_split" } },
      DEV_MUTATION_CATALOG
    )
  );

  const pLid = state.meta.playerLineageId;
  assert(Number(state.world.lineageMemory?.[pLid]?.splitUnlock || 0) === 1, "Split unlock missing in lineage memory");
  return state;
}

let pass = 0;
const total = 2;

try {
  const store = mkStore("split-overlap-block");
  let state = unlockSplit(store);
  state = { ...state, sim: { ...state.sim, playerDNA: Math.max(8, Number(state.sim.playerDNA || 0)) } };

  const origin = findEmptyClusterOrigin(state, 4);
  assert(origin, "No empty 4x4 region found for overlap gate");
  const blockX = origin.x + 1;
  const blockY = origin.y + 1;
  const blockIdx = blockY * state.world.w + blockX;

  state = applyPatches(
    {
      ...state,
      meta: { ...state.meta, placementCostEnabled: false },
    },
    handlePlaceCell(
      {
        ...state,
        meta: { ...state.meta, placementCostEnabled: false },
      },
      { type: "PLACE_CELL", payload: { x: blockX, y: blockY, remove: false } }
    )
  );
  assert(state.world.alive[blockIdx] === 1, "Pre-block cell was not placed");
  const aliveBefore = countAliveInRegion(state, origin, 4);

  state = { ...state, meta: { ...state.meta, placementCostEnabled: true } };
  const dnaBefore = Number(state.sim.playerDNA || 0);

  const splitPatches = handlePlaceSplitCluster(state, { type: "PLACE_SPLIT_CLUSTER", payload: { x: blockX, y: blockY } });
  state = applyPatches(state, splitPatches);
  const aliveAfter = countAliveInRegion(state, origin, 4);

  assert(aliveAfter === aliveBefore, `Overlap gate leaked partial split cells: ${aliveBefore} -> ${aliveAfter}`);
  assert(state.world.alive[blockIdx] === 1, "Overlap gate corrupted the blocking cell");
  assert(Number(state.sim.playerDNA || 0) === dnaBefore, `Rejected overlap split consumed DNA: ${dnaBefore} -> ${state.sim.playerDNA}`);
  console.log("  SPLIT overlap gate: occupied 4x4 blocks atomic placement");
  pass++;
} catch (err) {
  console.error("TEST1 SPLIT OVERLAP GATE FAIL:", err.message);
}

try {
  const store = mkStore("split-quarantine-block");
  let state = unlockSplit(store);
  state = { ...state, sim: { ...state.sim, playerDNA: Math.max(8, Number(state.sim.playerDNA || 0)) } };

  const origin = findEmptyClusterOrigin(state, 4);
  assert(origin, "No empty 4x4 region found for quarantine gate");
  const zoneX = origin.x + 1;
  const zoneY = origin.y + 1;

  state = applyPatches(state, handleSetZone(state, { type: "SET_ZONE", payload: { x: zoneX, y: zoneY, radius: 1, zoneType: 5 } }));
  const blockedTiles = countZoneTiles(state, origin, 5, 4);
  assert(blockedTiles >= 1, "Quarantine setup failed");
  const aliveBefore = countAliveInRegion(state, origin, 4);

  state = { ...state, meta: { ...state.meta, placementCostEnabled: true } };
  const dnaBefore = Number(state.sim.playerDNA || 0);

  const splitPatches = handlePlaceSplitCluster(state, { type: "PLACE_SPLIT_CLUSTER", payload: { x: zoneX, y: zoneY } });
  state = applyPatches(state, splitPatches);
  const aliveAfter = countAliveInRegion(state, origin, 4);

  assert(aliveBefore === 0 && aliveAfter === 0, `Quarantine gate leaked split cells: ${aliveBefore} -> ${aliveAfter}`);
  assert(Number(state.sim.playerDNA || 0) === dnaBefore, `Rejected quarantine split consumed DNA: ${dnaBefore} -> ${state.sim.playerDNA}`);
  console.log(`  SPLIT quarantine gate: ${blockedTiles} quarantine tiles block placement`);
  pass++;
} catch (err) {
  console.error("TEST2 SPLIT QUARANTINE GATE FAIL:", err.message);
}

console.log(`SPLIT_SECURITY_GATE_OK ${pass}/${total}`);
if (pass < total) process.exit(1);

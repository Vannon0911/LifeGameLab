import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-remote-reachability-gates.mjs");

import { reducer } from "../src/project/project.logic.js";
import { GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { TRAIT_COUNT } from "../src/game/sim/life.data.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeState({ visible = false, anchored = false } = {}) {
  const w = 16;
  const h = 16;
  const N = w * h;
  const world = {
    w,
    h,
    alive: new Uint8Array(N),
    E: new Float32Array(N),
    reserve: new Float32Array(N),
    link: new Float32Array(N),
    lineageId: new Uint32Array(N),
    hue: new Float32Array(N),
    trait: new Float32Array(N * TRAIT_COUNT),
    age: new Uint16Array(N),
    born: new Uint8Array(N),
    died: new Uint8Array(N),
    W: new Float32Array(N),
    zoneMap: new Int8Array(N),
    coreZoneMask: new Uint8Array(N),
    dnaZoneMask: new Uint8Array(N),
    visibility: new Uint8Array(N),
    explored: new Uint8Array(N),
    lineageMemory: {
      1: {
        splitUnlock: 1,
        techs: ["cluster_split"],
      },
    },
  };
  const splitCells = [];
  for (let yy = 7; yy < 11; yy++) {
    for (let xx = 7; xx < 11; xx++) {
      const idx = yy * w + xx;
      splitCells.push(idx);
      if (visible) {
        world.visibility[idx] = 1;
        world.explored[idx] = 1;
      }
    }
  }
  const centerIdx = 8 * w + 8;
  if (anchored) {
    const anchorIdx = 7 * w + 6;
    world.alive[anchorIdx] = 1;
    world.lineageId[anchorIdx] = 1;
    world.link[anchorIdx] = 1;
    world.visibility[anchorIdx] = 1;
    world.explored[anchorIdx] = 1;
  }
  return {
    meta: {
      gameMode: GAME_MODE.GENESIS,
      playerLineageId: 1,
      cpuLineageId: 2,
      placementCostEnabled: true,
    },
    sim: {
      runPhase: RUN_PHASE.RUN_ACTIVE,
      playerDNA: 100,
      playerStage: 5,
      playerAliveCount: 24,
      playerEnergyNet: 6,
      meanReserveAlive: 0.3,
      clusterRatio: 0.9,
      networkRatio: 0.9,
    },
    world,
    test: { centerIdx, splitCells },
  };
}

{
  const state = makeState({ visible: false, anchored: true });
  const patches = reducer(state, { type: "PLACE_SPLIT_CLUSTER", payload: { x: 8, y: 8 } }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "split cluster must stay blocked without current visibility");
}

{
  const state = makeState({ visible: true, anchored: false });
  const patches = reducer(state, { type: "PLACE_SPLIT_CLUSTER", payload: { x: 8, y: 8 } }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "split cluster must stay blocked without committed anchor");
}

{
  const state = makeState({ visible: true, anchored: true });
  const patches = reducer(state, { type: "PLACE_SPLIT_CLUSTER", payload: { x: 8, y: 8 } }, { rng: {} });
  assert(Array.isArray(patches) && patches.length > 0, "split cluster must unlock on visible committed reach");
}

{
  const state = makeState({ visible: false, anchored: true });
  const patches = reducer(state, { type: "SET_ZONE", payload: { x: 8, y: 8, radius: 2, zoneType: 4 } }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "zone paint must stay blocked outside sight");
}

{
  const state = makeState({ visible: true, anchored: true });
  const patches = reducer(state, { type: "SET_ZONE", payload: { x: 8, y: 8, radius: 2, zoneType: 4 } }, { rng: {} });
  assert(Array.isArray(patches) && patches.length > 0, "zone paint must stay allowed on visible committed reach");
}

console.log("REMOTE_REACHABILITY_GATES_OK split and zone reachability guards verified");

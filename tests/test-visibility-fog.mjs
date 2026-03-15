import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-visibility-fog.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { RUN_PHASE, ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function extractSetPatch(patches, path) {
  return patches.find((patch) => patch && patch.op === "set" && patch.path === path)?.value ?? null;
}

const CORE_ZONE_ID = 101;
const DNA_ZONE_ID = 202;
const INFRA_ZONE_ID = 303;

function ensureZoneMeta(state, zoneId, role) {
  if (!state.world.zoneMeta || typeof state.world.zoneMeta !== "object") state.world.zoneMeta = {};
  const key = String(zoneId);
  const prev = state.world.zoneMeta[key];
  state.world.zoneMeta[key] = {
    ...(prev && typeof prev === "object" ? prev : {}),
    zoneId,
    role,
  };
}

function makeTamperedState(seed = "visibility-fog-base") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  const base = store.getState();
  const N = base.world.w * base.world.h;
  return {
    ...base,
    meta: {
      ...base.meta,
      playerLineageId: 1,
      cpuLineageId: 2,
    },
    sim: {
      ...base.sim,
      runPhase: RUN_PHASE.RUN_ACTIVE,
      running: true,
    },
    world: {
      ...base.world,
      alive: new Uint8Array(N),
      lineageId: new Uint32Array(N),
      coreZoneMask: new Uint8Array(N),
      dnaZoneMask: new Uint8Array(N),
      zoneRole: new Uint8Array(N),
      zoneId: new Int32Array(N),
      zoneMeta: {},
      link: new Float32Array(N),
      visibility: new Uint8Array(N),
      explored: new Uint8Array(N),
      born: new Uint8Array(N),
      died: new Uint8Array(N),
      age: new Uint16Array(N),
      E: new Float32Array(N).fill(1),
      L: new Float32Array(N).fill(1),
      R: new Float32Array(N).fill(1),
      W: new Float32Array(N),
      P: new Float32Array(N),
      B: new Float32Array(N),
      reserve: new Float32Array(N),
      clusterField: new Float32Array(N),
    },
  };
}

function setPlayerTile(state, x, y, { core = false, dna = false, infra = false } = {}) {
  const idx = y * state.world.w + x;
  state.world.alive[idx] = 1;
  state.world.lineageId[idx] = state.meta.playerLineageId;
  if (core) {
    state.world.coreZoneMask[idx] = 1;
    state.world.zoneRole[idx] = ZONE_ROLE.CORE;
    state.world.zoneId[idx] = CORE_ZONE_ID;
    ensureZoneMeta(state, CORE_ZONE_ID, ZONE_ROLE.CORE);
  }
  if (dna) {
    state.world.dnaZoneMask[idx] = 1;
    state.world.zoneRole[idx] = ZONE_ROLE.DNA;
    state.world.zoneId[idx] = DNA_ZONE_ID;
    ensureZoneMeta(state, DNA_ZONE_ID, ZONE_ROLE.DNA);
  }
  if (infra) {
    state.world.link[idx] = 1;
    state.world.zoneRole[idx] = ZONE_ROLE.INFRA;
    state.world.zoneId[idx] = INFRA_ZONE_ID;
    ensureZoneMeta(state, INFRA_ZONE_ID, ZONE_ROLE.INFRA);
  }
  return idx;
}

function setCpuTile(state, x, y, link = 0) {
  const idx = y * state.world.w + x;
  state.world.alive[idx] = 1;
  state.world.lineageId[idx] = state.meta.cpuLineageId;
  state.world.link[idx] = link;
  return idx;
}

function isVisible(mask, state, x, y) {
  return (Number(mask[(y * state.world.w) + x] || 0) | 0) === 1;
}

{
  const state = makeTamperedState("visibility-fog-sources");
  setPlayerTile(state, 3, 3, { core: true });
  setPlayerTile(state, 8, 3, { dna: true });
  setPlayerTile(state, 11, 10, { infra: true });
  const patches = simStepPatch(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
  const visibility = extractSetPatch(patches, "/world/visibility");
  const explored = extractSetPatch(patches, "/world/explored");
  assert(visibility && explored, "visibility/explored must be patched on sim step");
  assert(isVisible(visibility, state, 3, 1), "core radius 2 must reveal vertical distance 2");
  assert(!isVisible(visibility, state, 3, 0), "core radius 2 must not reveal vertical distance 3");
  assert(isVisible(visibility, state, 10, 3), "dna radius 2 must reveal horizontal distance 2");
  assert(!isVisible(visibility, state, 11, 3), "dna radius 2 must not reveal horizontal distance 3");
  assert(isVisible(visibility, state, 12, 10), "infra radius 1 must reveal orthogonal neighbor");
  assert(!isVisible(visibility, state, 13, 10), "infra radius 1 must not reveal distance 2");
  assert(isVisible(explored, state, 12, 10), "visible tiles must become explored");
}

// Canonical migration invariant:
// when legacy masks/links are removed but canonical zone mirrors remain,
// visibility semantics must stay equivalent.
{
  const state = makeTamperedState("visibility-fog-canonical-only");
  setPlayerTile(state, 3, 3, { core: true });
  setPlayerTile(state, 8, 3, { dna: true });
  setPlayerTile(state, 11, 10, { infra: true });

  state.world.coreZoneMask.fill(0);
  state.world.dnaZoneMask.fill(0);
  state.world.link.fill(0);

  const patches = simStepPatch(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
  const visibility = extractSetPatch(patches, "/world/visibility");
  assert(visibility, "canonical-only visibility must still be patched on sim step");
  assert(isVisible(visibility, state, 3, 1), "canonical core radius 2 must reveal vertical distance 2");
  assert(!isVisible(visibility, state, 3, 0), "canonical core radius 2 must not reveal vertical distance 3");
  assert(isVisible(visibility, state, 10, 3), "canonical dna radius 2 must reveal horizontal distance 2");
  assert(!isVisible(visibility, state, 11, 3), "canonical dna radius 2 must not reveal horizontal distance 3");
  assert(isVisible(visibility, state, 12, 10), "canonical infra radius 1 must reveal orthogonal neighbor");
  assert(!isVisible(visibility, state, 13, 10), "canonical infra radius 1 must not reveal distance 2");
}

{
  const state = makeTamperedState("visibility-fog-memory");
  const sourceIdx = setPlayerTile(state, 5, 5, { core: true });
  state.world.explored[(5 * state.world.w) + 7] = 1;
  let patches = simStepPatch(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
  const firstExplored = new Uint8Array(extractSetPatch(patches, "/world/explored"));
  assert((Number(firstExplored[(5 * state.world.w) + 7] || 0) | 0) === 1, "pre-explored memory must survive first recompute");
  state.world.explored = firstExplored;
  state.world.visibility = new Uint8Array(extractSetPatch(patches, "/world/visibility"));
  state.world.coreZoneMask[sourceIdx] = 0;
  state.world.alive[sourceIdx] = 0;
  state.world.lineageId[sourceIdx] = 0;
  patches = simStepPatch(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
  const secondVisibility = extractSetPatch(patches, "/world/visibility");
  const secondExplored = extractSetPatch(patches, "/world/explored");
  assert((Number(secondVisibility[(5 * state.world.w) + 5] || 0) | 0) === 0, "visibility must clear when sight source is gone");
  assert((Number(secondExplored[(5 * state.world.w) + 5] || 0) | 0) === 1, "explored must persist after sight loss");
  assert((Number(secondExplored[(5 * state.world.w) + 7] || 0) | 0) === 1, "existing explored memory must stay monotonic");
}

{
  const state = makeTamperedState("visibility-fog-committed-infra");
  const playerIdx = setPlayerTile(state, 9, 9);
  state.world.link[playerIdx] = 0.95;
  setCpuTile(state, 12, 12, 1);
  const patches = simStepPatch(state, { type: "SIM_STEP", payload: { force: true } }, { rng: {} });
  const visibility = extractSetPatch(patches, "/world/visibility");
  assert(visibility, "dynamic-link counterexample must still patch visibility");
  assert(!isVisible(visibility, state, 10, 9), "player dynamic link below committed threshold must not grant infra sight");
  assert(!isVisible(visibility, state, 13, 12), "cpu link must not leak player visibility");
  const link = extractSetPatch(patches, "/world/link");
  assert((Number(link[playerIdx] || 0) < 0.999), "non-committed player link must stay below committed threshold");
}

console.log("VISIBILITY_FOG_OK sources, explored memory, and committed infra gating verified");

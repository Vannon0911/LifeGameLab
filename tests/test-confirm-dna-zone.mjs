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

function patchPlayerCells(store, cells) {
  const state = store.getState();
  const alive = new Uint8Array(state.world.alive);
  const lineageId = new Uint32Array(state.world.lineageId);
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  for (const { x, y } of cells) {
    const idx = y * state.world.w + x;
    alive[idx] = 1;
    lineageId[idx] = playerLineageId;
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
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/sim/zoneUnlockProgress", value: 1 },
      ],
    },
  });

  const active = store.getState();
  const coreIndices = [];
  for (let i = 0; i < active.world.coreZoneMask.length; i++) {
    if ((Number(active.world.coreZoneMask[i]) | 0) === 1) coreIndices.push(i);
  }
  const coreXY = coreIndices.map((idx) => ({ x: idx % active.world.w, y: (idx / active.world.w) | 0 }));
  const minX = Math.min(...coreXY.map((pos) => pos.x));
  const maxY = Math.max(...coreXY.map((pos) => pos.y));
  const validCells = [
    { x: minX - 1, y: coreXY[0].y },
    { x: minX - 1, y: maxY },
    { x: minX - 1, y: maxY + 1 },
    { x: minX, y: maxY + 1 },
  ];
  patchPlayerCells(store, validCells);
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

  const coreZoneIds = new Set();
  for (let i = 0; i < after.world.coreZoneMask.length; i++) {
    if ((Number(after.world.coreZoneMask[i]) | 0) !== 1) continue;
    coreZoneIds.add(Number(after.world.zoneId?.[i] || 0) | 0);
  }

  const dnaZoneIds = new Set();
  for (const cell of validCells) {
    const idx = cell.y * after.world.w + cell.x;
    assert(Number(after.world.dnaZoneMask[idx] || 0) === 1, "confirm dna zone must preserve committed mask");
    assert((Number(after.world.zoneRole?.[idx]) | 0) === ZONE_ROLE.DNA, `dna role mirror drift at idx=${idx}`);
    const zoneId = Number(after.world.zoneId?.[idx] || 0) | 0;
    assert(zoneId > 0, `dna zoneId missing at idx=${idx}`);
    dnaZoneIds.add(zoneId);
  }
  assert(dnaZoneIds.size === 1, `dna zoneId must be stable across committed component, got ${Array.from(dnaZoneIds).join(",")}`);
  const dnaZoneId = Array.from(dnaZoneIds)[0] | 0;
  assert(!coreZoneIds.has(dnaZoneId), `dna zoneId must not alias core zoneId (${dnaZoneId})`);
  const dnaMeta = findZoneMetaEntry(after.world.zoneMeta, dnaZoneId);
  assert(dnaMeta, "dna zoneMeta entry missing");
  const dnaMetaRole = dnaMeta.role ?? dnaMeta.zoneRole ?? dnaMeta.kind ?? "";
  assert(
    dnaMetaRole === ZONE_ROLE.DNA || String(dnaMetaRole).toLowerCase() === "dna",
    `dna zoneMeta role drift: ${String(dnaMetaRole)}`,
  );

  const dnaBeforeTick = Number(after.sim.playerDNA || 0);
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  const afterTick = store.getState();
  assert(Number(afterTick.sim.playerDNA || 0) > dnaBeforeTick, "committed dna zone must generate deterministic dna on sim step");
}

console.log("CONFIRM_DNA_ZONE_OK validation and commit path verified");

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-confirm-core-zone.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createGenesisZoneStore(seed, presetId = "river_delta") {
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
  return store;
}

// success path: founder component becomes exact core zone with preset-bound unlock defaults.
{
  const store = createGenesisZoneStore("confirm-core-zone-success-1", "dry_basin");
  const before = store.getState();
  assert(before.sim.runPhase === RUN_PHASE.GENESIS_ZONE, "core confirm requires genesis zone");
  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "core confirm must start active run");
  assert(after.sim.running === true, "core confirm must set running=true");
  assert(after.sim.unlockedZoneTier === 1, "core confirm must unlock tier 1");
  assert(after.sim.nextZoneUnlockKind === "DNA", "core confirm must target DNA unlock");
  assert(after.sim.nextZoneUnlockCostEnergy === 16, "core confirm must read preset unlock cost");
  assert(after.sim.zoneUnlockProgress === 0, "core confirm must reset unlock progress");
  assert(after.sim.coreEnergyStableTicks === 0, "core confirm must reset stable ticks");
  assert(after.sim.cpuBootstrapDone === 1, "core confirm must mark cpu bootstrap done");

  let founderCount = 0;
  let coreCount = 0;
  let cpuAliveCount = 0;
  for (let i = 0; i < after.world.founderMask.length; i++) {
    const founder = Number(after.world.founderMask[i]) | 0;
    const core = Number(after.world.coreZoneMask[i]) | 0;
    const alive = Number(after.world.alive[i]) | 0;
    const lineage = Number(after.world.lineageId[i]) | 0;
    if (founder === 1) founderCount++;
    if (core === 1) coreCount++;
    assert(core === founder, `core mask drift at idx=${i}`);
    if (alive === 1 && lineage === (Number(after.meta.cpuLineageId || 2) | 0)) cpuAliveCount++;
  }
  assert(founderCount === 4, `expected 4 founders, got ${founderCount}`);
  assert(coreCount === 4, `expected 4 core tiles, got ${coreCount}`);
  assert(cpuAliveCount === 4, `expected 4 cpu bootstrap cells, got ${cpuAliveCount}`);
}

// ticked progress must be real runtime state, not a static bootstrap placeholder.
{
  const store = createGenesisZoneStore("confirm-core-zone-progress-1", "wet_meadow");
  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  const afterConfirm = store.getState();
  assert(afterConfirm.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "progress test requires active run after core confirm");
  const prevStableTicks = Number(afterConfirm.sim.coreEnergyStableTicks || 0);
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  const afterTick = store.getState();
  assert(Number(afterTick.sim.tick || 0) > Number(afterConfirm.sim.tick || 0), "active run must advance after core confirm");
  assert(Number(afterTick.sim.zoneUnlockProgress || 0) >= 0, "zoneUnlockProgress must stay numeric");
  assert(Number(afterTick.sim.zoneUnlockProgress || 0) <= 1, "zoneUnlockProgress must stay normalized");
  assert(Number(afterTick.sim.coreEnergyStableTicks || 0) >= prevStableTicks, "stable ticks must be tick-driven after core confirm");
}

// wrong phase must block core confirm.
{
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: "confirm-core-zone-wrong-phase-1" });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  const before = store.getSignature();
  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  assert(store.getSignature() === before, "core confirm must be blocked outside genesis zone");
}

// existing non-empty coreZoneMask must block repeated confirm.
{
  const store = createGenesisZoneStore("confirm-core-zone-repeat-1");
  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  const afterFirst = store.getState();
  const sig = store.getSignature();
  assert(afterFirst.world.coreZoneMask.some((v) => (Number(v) | 0) === 1), "first core confirm must stamp mask");
  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  assert(store.getSignature() === sig, "repeated core confirm must be no-op once core exists");
}

// deterministic cpu bootstrap: same seed + preset must place identical cpu cluster.
{
  const a = createGenesisZoneStore("confirm-core-zone-deterministic-1", "wet_meadow");
  const b = createGenesisZoneStore("confirm-core-zone-deterministic-1", "wet_meadow");
  a.dispatch({ type: "CONFIRM_CORE_ZONE" });
  b.dispatch({ type: "CONFIRM_CORE_ZONE" });
  const stateA = a.getState();
  const stateB = b.getState();
  assert(
    JSON.stringify(Array.from(stateA.world.alive)) === JSON.stringify(Array.from(stateB.world.alive)),
    "cpu bootstrap alive mask must be deterministic",
  );
  assert(
    JSON.stringify(Array.from(stateA.world.lineageId)) === JSON.stringify(Array.from(stateB.world.lineageId)),
    "cpu bootstrap lineage map must be deterministic",
  );
}

// inconsistent founder component must block core confirm.
{
  const store = createGenesisZoneStore("confirm-core-zone-invalid-founder-1");
  const state = store.getState();
  const tamperedMask = new state.world.founderMask.constructor(state.world.founderMask);
  tamperedMask.set(state.world.founderMask);
  for (let i = 0; i < tamperedMask.length; i++) {
    if ((Number(tamperedMask[i]) | 0) === 1) {
      tamperedMask[i] = 0;
      break;
    }
  }
  const tamperedState = {
    ...state,
    world: {
      ...state.world,
      founderMask: tamperedMask,
    },
  };
  const patches = reducer(tamperedState, { type: "CONFIRM_CORE_ZONE" }, { rng: {} });
  assert(Array.isArray(patches) && patches.length === 0, "invalid founder component must block core confirm");
}

console.log("CONFIRM_CORE_ZONE_OK founder component -> core zone verified");

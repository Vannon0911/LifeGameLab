import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-start-dna-zone-setup.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createActiveCoreStore(seed, presetId = "river_delta") {
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
  return store;
}

// blocked while the DNA meter is not yet full.
{
  const store = createActiveCoreStore("start-dna-zone-setup-blocked-1");
  const before = store.getState();
  assert(before.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "blocked case requires active run");
  assert(Number(before.sim.zoneUnlockProgress || 0) < 1, "blocked case expects incomplete dna meter");
  const sigBefore = store.getSignature();
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  assert(store.getSignature() === sigBefore, "dna zone setup must stay blocked before meter is full");
}

// success path: full meter moves RUN_ACTIVE -> DNA_ZONE_SETUP and allocates preset budget.
{
  const store = createActiveCoreStore("start-dna-zone-setup-success-1", "wet_meadow");
  const before = store.getState();
  const tileCount = before.world.w * before.world.h;
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/sim/zoneUnlockProgress", value: 1 },
      ],
    },
  });
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  const after = store.getState();
  assert(after.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "start dna zone setup must enter DNA_ZONE_SETUP");
  assert(after.sim.running === false, "dna zone setup must pause the run");
  assert(after.sim.zone2Unlocked === true, "dna zone setup must mark zone2 unlocked");
  assert(after.sim.zone2PlacementBudget === 4, "dna zone setup must read preset placement budget");
  assert(after.world.dnaZoneMask.length === tileCount, "dna zone mask length drift");
  assert(after.world.dnaZoneMask.every((value) => (Number(value) | 0) === 0), "dna zone mask must be reset empty on setup start");
}

// wrong mode/phase remains blocked.
{
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: "start-dna-zone-setup-lab-1" });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  const sigBefore = store.getSignature();
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  assert(store.getSignature() === sigBefore, "dna zone setup must be blocked in lab mode");
}

// repeated start is no-op once setup is already active.
{
  const store = createActiveCoreStore("start-dna-zone-setup-repeat-1");
  store.dispatch({
    type: "APPLY_BUFFERED_SIM_STEP",
    payload: {
      patches: [
        { op: "set", path: "/sim/zoneUnlockProgress", value: 1 },
      ],
    },
  });
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  const sigAfterFirst = store.getSignature();
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  assert(store.getSignature() === sigAfterFirst, "dna zone setup must not re-enter once already active");
}

console.log("START_DNA_ZONE_SETUP_OK meter gate and setup transition verified");

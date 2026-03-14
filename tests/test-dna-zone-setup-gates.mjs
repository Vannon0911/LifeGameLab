import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-dna-zone-setup-gates.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function prepareDnaSetupStore(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
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
      patches: [{ op: "set", path: "/sim/zoneUnlockProgress", value: 1 }],
    },
  });
  store.dispatch({ type: "START_DNA_ZONE_SETUP" });
  return store;
}

const store = prepareDnaSetupStore("dna-zone-setup-gates-1");
const before = store.getState();
assert(before.sim.runPhase === RUN_PHASE.DNA_ZONE_SETUP, "gate test requires dna zone setup");

const blockedActions = [
  { type: "PLACE_CELL", payload: { x: 2, y: 2, remove: false } },
  { type: "HARVEST_PULSE", payload: {} },
  { type: "SET_ZONE", payload: { x: 4, y: 4, radius: 1, zoneType: 1 } },
  { type: "TOGGLE_RUNNING", payload: { running: true } },
  { type: "APPLY_BUFFERED_SIM_STEP", payload: { patches: [{ op: "set", path: "/sim/tick", value: 999 }] } },
];

for (const action of blockedActions) {
  const sigBefore = store.getSignature();
  store.dispatch(action);
  assert(store.getSignature() === sigBefore, `action must stay blocked in DNA_ZONE_SETUP: ${action.type}`);
}

console.log("DNA_ZONE_SETUP_GATES_OK pre-run setup blocks legacy and runtime actions");

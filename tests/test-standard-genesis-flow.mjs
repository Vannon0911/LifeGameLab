import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-standard-genesis-flow.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "standard-genesis-flow-1" });
store.dispatch({ type: "GEN_WORLD" });
store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });

const start = store.getState();
assert(start.meta.gameMode === GAME_MODE.GENESIS, `expected genesis mode, got ${start.meta.gameMode}`);
assert(start.sim.runPhase === RUN_PHASE.GENESIS_SETUP, `expected genesis setup, got ${start.sim.runPhase}`);
assert(start.sim.running === false, "standard flow must start paused");

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
const afterFoundation = store.getState();
assert(afterFoundation.sim.runPhase === RUN_PHASE.GENESIS_ZONE, "foundation confirm must enter genesis zone");
assert(afterFoundation.sim.running === false, "genesis zone must remain paused");

store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const afterBlockedStep = store.getState();
assert(
  Number(afterBlockedStep.sim.tick || 0) === Number(afterFoundation.sim.tick || 0),
  "sim step must stay blocked in genesis zone",
);

store.dispatch({ type: "CONFIRM_CORE_ZONE" });
const afterCore = store.getState();
assert(afterCore.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "core confirm must enter active run");
assert(afterCore.sim.running === true, "core confirm must start active run");
assert(Number(afterCore.sim.unlockedZoneTier || 0) === 1, "tier 1 unlock must be active after core confirm");
assert(String(afterCore.sim.nextZoneUnlockKind || "") === "DNA", "next unlock kind must be DNA");
assert(afterCore.world.coreZoneMask.some((value) => (Number(value) | 0) === 1), "core zone mask must be stamped");

store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const afterActiveStep = store.getState();
assert(
  Number(afterActiveStep.sim.tick || 0) > Number(afterCore.sim.tick || 0),
  "active run must advance after second confirm",
);
assert(Number(afterActiveStep.sim.zoneUnlockProgress || 0) >= 0, "unlock progress must remain numeric");
assert(Number(afterActiveStep.sim.zoneUnlockProgress || 0) <= 1, "unlock progress must stay normalized");

console.log("STANDARD_GENESIS_FLOW_OK two-confirm standard flow reaches active run");

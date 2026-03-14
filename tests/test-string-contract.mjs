import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-string-contract.mjs");
import { createStore } from "../src/core/kernel/store.js";
import { manifest } from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import {
  GAME_MODE,
  GAME_RESULT,
  GOAL_CODE_VALUES,
  OVERLAY_MODE,
  RUN_PHASE,
  WIN_MODE,
  WIN_MODE_RESULT_LABEL,
  WIN_MODE_SELECTABLE,
} from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

assert(store.getState().sim.winMode === WIN_MODE.SUPREMACY, "default winMode drift");
assert(store.getState().sim.gameResult === GAME_RESULT.NONE, "default gameResult drift");
assert(typeof store.getState().sim.goal === "string", "default goal missing");
assert(store.getState().meta.placementCostEnabled === true, "placement cost default drift");
assert(store.getState().meta.activeOverlay === OVERLAY_MODE.NONE, "activeOverlay default drift");
assert(store.getState().meta.globalLearning?.enabled === false, "global learning default drift");
assert(RUN_PHASE.GENESIS_ZONE === "genesis_zone", "RUN_PHASE.GENESIS_ZONE contract id drift");
assert(RUN_PHASE.DNA_ZONE_SETUP === "dna_zone_setup", "RUN_PHASE.DNA_ZONE_SETUP contract id drift");

const sigA = store.getSignature();
store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "INVALID_MODE" } });
assert(store.getSignature() === sigA, "invalid brushMode mutated state");

const sigB = store.getSignature();
store.dispatch({ type: "SET_OVERLAY", payload: "INVALID_OVERLAY" });
assert(store.getSignature() === sigB, "invalid overlay mutated state");

const sigC = store.getSignature();
store.dispatch({ type: "SET_WIN_MODE", payload: { winMode: "territory" } });
assert(store.getSignature() === sigC, "invalid winMode mutated state");

store.dispatch({ type: "SET_WIN_MODE", payload: { winMode: WIN_MODE.STOCKPILE } });
assert(store.getState().sim.winMode === WIN_MODE.STOCKPILE, "stockpile mode not applied");

store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const winModeAfterFirstTick = store.getState().sim.winMode;
store.dispatch({ type: "SET_WIN_MODE", payload: { winMode: WIN_MODE.EFFICIENCY } });
assert(store.getState().sim.winMode === winModeAfterFirstTick, "winMode changed after tick 1 lock");
const goal = String(store.getState().sim.goal || "");
assert(GOAL_CODE_VALUES.includes(goal), `goal must be canonical code, got '${goal}'`);

assert(WIN_MODE_SELECTABLE.includes(WIN_MODE.STOCKPILE), "stockpile must stay selectable contract id");
assert(!WIN_MODE_SELECTABLE.includes("territory"), "territory must not become selectable contract id");
assert(typeof WIN_MODE_RESULT_LABEL[WIN_MODE.STOCKPILE] === "string", "stockpile UI label missing");

console.log("STRING_CONTRACT_OK brush/overlay/winmode/goal contracts stable");

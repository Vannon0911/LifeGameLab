import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-simstep-buffer-guard.mjs");
import { createStore } from "../src/core/kernel/store.js";
import { createSimStepBuffer } from "../src/core/runtime/simStepBuffer.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "buffer-guard-seed" });
store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

const evilProject = {
  reducer,
  simStep: (state, action, ctx) => {
    crypto.randomUUID();
    return simStepPatch(state, action, ctx);
  },
};
const buffer = createSimStepBuffer({
  store,
  manifest,
  project: evilProject,
  maxBufferedSteps: 1,
});

let blocked = false;
try {
  buffer._debugComputeOne();
} catch (err) {
  blocked = String(err?.message || "").includes("Non-deterministic source blocked: crypto.randomUUID()");
}
assert(blocked, "simStep buffer path must run under determinism guard and block crypto entropy");

console.log("SIMSTEP_BUFFER_GUARD_OK buffer compute path blocks non-deterministic entropy");

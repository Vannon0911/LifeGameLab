import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function mkStore(seed = "interact-1") {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  return store;
}

const store = mkStore();

// SET_UI must not be placebo.
store.dispatch({ type: "SET_UI", payload: { showBiochargeOverlay: true, expertMode: true } });
let s = store.getState();
assert(s.meta.ui.showBiochargeOverlay === true, "SET_UI did not set showBiochargeOverlay");
assert(s.meta.ui.expertMode === true, "SET_UI did not set expertMode");

// SET_GLOBAL_LEARNING must change fields.
store.dispatch({ type: "SET_GLOBAL_LEARNING", payload: { enabled: false, strength: 0.9 } });
s = store.getState();
assert(s.meta.globalLearning.enabled === false, "SET_GLOBAL_LEARNING did not set enabled");
assert(Math.abs(Number(s.meta.globalLearning.strength) - 0.9) < 1e-9, "SET_GLOBAL_LEARNING did not set strength");

// SET_BRUSH must update meta.
store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "toxin", brushRadius: 7 } });
s = store.getState();
assert(s.meta.brushMode === "toxin", "SET_BRUSH did not set brushMode");
assert(s.meta.brushRadius === 7, "SET_BRUSH did not set brushRadius");

// SET_RENDER_MODE must update meta.
store.dispatch({ type: "SET_RENDER_MODE", payload: "combined" });
s = store.getState();
assert(s.meta.renderMode === "combined", "SET_RENDER_MODE did not set renderMode");

// SET_PHYSICS must accept known keys.
store.dispatch({ type: "SET_PHYSICS", payload: { L_diffusion: 0.01 } });
s = store.getState();
assert(Math.abs(Number(s.meta.physics.L_diffusion) - 0.01) < 1e-9, "SET_PHYSICS did not set L_diffusion");

// PAINT_BRUSH must change world arrays.
const beforeW = store.getState().world.W;
const idx = 10 * store.getState().world.w + 10;
const tox0 = Number(beforeW[idx]);
store.dispatch({ type: "PAINT_BRUSH", payload: { x: 10, y: 10, radius: 3, mode: "toxin" } });
s = store.getState();
assert(s.world.W !== beforeW, "PAINT_BRUSH must replace world.W reference");
assert(Number(s.world.W[idx]) >= tox0, "PAINT_BRUSH did not increase toxin at target");

// PLACE_CELL add/remove must affect alive array.
store.dispatch({ type: "PLACE_CELL", payload: { x: 4, y: 4, remove: false } });
s = store.getState();
const id44 = 4 * s.world.w + 4;
assert(s.world.alive[id44] === 1, "PLACE_CELL add did not set alive");
store.dispatch({ type: "PLACE_CELL", payload: { x: 4, y: 4, remove: true } });
s = store.getState();
assert(s.world.alive[id44] === 0, "PLACE_CELL remove did not clear alive");
assert((s.world.E[id44] || 0) === 0, "PLACE_CELL remove did not clear energy");

// DEV_BALANCE_RUN_AI must not throw and must record audit (even if applied=0).
store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
for (let i = 0; i < 10; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });
store.dispatch({
  type: "DEV_BALANCE_RUN_AI",
  payload: {
    mode: "stabilize",
    preferredBlocks: ["reserve_buffer", "cooperative_network"],
    targets: [{ lineageId: 1, weight: 1.0 }],
    intensity: 0.02,
    chainLength: 2,
    maxCellsPerLineage: 8,
  },
});
s = store.getState();
assert(!!s.world.devAiLast, "DEV_BALANCE_RUN_AI did not set world.devAiLast");
assert(!!s.meta.devMutationVault, "DEV_BALANCE_RUN_AI did not update meta.devMutationVault");

console.log("INTERACTIONS_OK all user actions change state and do not throw");

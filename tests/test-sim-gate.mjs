import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-sim-gate.mjs");
import { assertSimPatchesAllowed } from "../src/game/sim/gate.js";
import { makeInitialState } from "../src/project/project.logic.js";
import { manifest } from "../src/project/project.manifest.js";

function mustThrow(fn, label) {
  try {
    fn();
  } catch (e) {
    console.log(`${label}: OK (${String(e?.message || e)})`);
    return;
  }
  throw new Error(`${label}: expected throw`);
}

const state = makeInitialState();

mustThrow(() => {
  assertSimPatchesAllowed(manifest, state, "SIM_STEP", [{ op: "set", path: "/world/evilKey", value: 1 }]);
}, "SIM_GATE_UNKNOWN_WORLD_KEY");

mustThrow(() => {
  assertSimPatchesAllowed(manifest, state, "SIM_STEP", [{ op: "set", path: "/sim/evilKey", value: 1 }]);
}, "SIM_GATE_UNKNOWN_SIM_KEY");

mustThrow(() => {
  // Wrong constructor for alive
  assertSimPatchesAllowed(manifest, state, "SIM_STEP", [{ op: "set", path: "/world/alive", value: new Float32Array(1024) }]);
}, "SIM_GATE_WRONG_TYPEDARRAY");

console.log("SIM_GATE_OK");

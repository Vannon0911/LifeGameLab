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

function mustNotThrow(fn, label) {
  try {
    fn();
    console.log(`${label}: OK`);
  } catch (e) {
    throw new Error(`${label}: unexpected throw ${String(e?.message || e)}`);
  }
}

const state = makeInitialState();
const tileCount = Number(state.meta?.gridW || 0) * Number(state.meta?.gridH || 0);

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

mustNotThrow(() => {
  assertSimPatchesAllowed(manifest, state, "CONFIRM_CORE_ZONE", [
    { op: "set", path: "/world/coreZoneMask", value: new Uint8Array(tileCount) },
    { op: "set", path: "/sim/unlockedZoneTier", value: 1 },
    { op: "set", path: "/sim/nextZoneUnlockKind", value: "DNA" },
    { op: "set", path: "/sim/nextZoneUnlockCostEnergy", value: 12 },
    { op: "set", path: "/sim/zoneUnlockProgress", value: 0 },
    { op: "set", path: "/sim/coreEnergyStableTicks", value: 0 },
    { op: "set", path: "/sim/cpuBootstrapDone", value: 0 },
  ]);
}, "SIM_GATE_PHASE_B_CONTRACT_KEYS");

console.log("SIM_GATE_OK");

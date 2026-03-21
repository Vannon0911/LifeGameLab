import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

function runScenario(seed) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const afterWorldGen = snapshotStore(store);

  store.dispatch({ type: "SET_UI", payload: { runPhase: "run_active" } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  const afterRunStart = snapshotStore(store);

  store.dispatch({ type: "SIM_STEP", payload: {} });
  const tick1 = snapshotStore(store);
  store.dispatch({ type: "SIM_STEP", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
  const tick4 = snapshotStore(store);

  assert.equal(afterWorldGen.state.sim.runPhase, "run_active", "GEN_WORLD must initialize directly in run_active");
  assert.equal(afterWorldGen.state.sim.running, false, "GEN_WORLD must keep running=false before explicit toggle");
  assert.equal(afterRunStart.state.sim.running, true, "explicit toggle must activate runtime");
  assert(tick4.state.sim.tick >= 4, "scenario must advance at least four ticks");

  return {
    seed,
    anchors: {
      afterWorldGen,
      afterRunStart,
      tick1,
      tick4,
    },
  };
}

function assertSameSeedReplay(left, right, label) {
  for (const anchor of ["afterWorldGen", "tick1", "tick4"]) {
    assert.equal(left.anchors[anchor].signature, right.anchors[anchor].signature, `${label}:${anchor} signature drifted`);
    assert.equal(
      left.anchors[anchor].signatureMaterialHash,
      right.anchors[anchor].signatureMaterialHash,
      `${label}:${anchor} signature material drifted`,
    );
    assert.equal(
      left.anchors[anchor].readModelHash,
      right.anchors[anchor].readModelHash,
      `${label}:${anchor} read model drifted`,
    );
  }
}

const sameSeedLeft = runScenario("p0-seed-main");
const sameSeedRight = runScenario("p0-seed-main");
const crossSeed = runScenario("p0-seed-alt");

assertSameSeedReplay(sameSeedLeft, sameSeedRight, "same-seed");
assert.notEqual(
  sameSeedLeft.anchors.afterWorldGen.signatureMaterialHash,
  crossSeed.anchors.afterWorldGen.signatureMaterialHash,
  "cross-seed worldgen signature material must diverge",
);
assert.notEqual(
  sameSeedLeft.anchors.tick1.readModelHash,
  crossSeed.anchors.tick1.readModelHash,
  "cross-seed tick1 read model must diverge",
);
assert.notEqual(
  sameSeedLeft.anchors.tick4.signatureMaterialHash,
  crossSeed.anchors.tick4.signatureMaterialHash,
  "cross-seed tick4 signature material must diverge",
);
assert.notEqual(
  sameSeedLeft.anchors.tick4.readModelHash,
  crossSeed.anchors.tick4.readModelHash,
  "cross-seed tick4 read model must diverge",
);

console.log(
  `RTS_DETERMINISM_OK seed=${sameSeedLeft.seed} worldgen=${sameSeedLeft.anchors.afterWorldGen.signature}:${sameSeedLeft.anchors.afterWorldGen.signatureMaterialHash}:${sameSeedLeft.anchors.afterWorldGen.readModelHash} tick1=${sameSeedLeft.anchors.tick1.signature}:${sameSeedLeft.anchors.tick1.signatureMaterialHash}:${sameSeedLeft.anchors.tick1.readModelHash} tick4=${sameSeedLeft.anchors.tick4.signature}:${sameSeedLeft.anchors.tick4.signatureMaterialHash}:${sameSeedLeft.anchors.tick4.readModelHash} cross-seed=${crossSeed.seed}:${crossSeed.anchors.tick4.signatureMaterialHash}:${crossSeed.anchors.tick4.readModelHash}`,
);

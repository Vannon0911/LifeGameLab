import assert from "node:assert/strict";

import { createDeterministicStore, getPlayerStartWindowSquare, snapshotStore } from "./support/liveTestKit.mjs";

function runScenario(seed) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "founder_place" } });
  const founderTiles = getPlayerStartWindowSquare(store.getState(), 2);
  for (const tile of founderTiles) {
    store.dispatch({ type: "PLACE_CELL", payload: { x: tile.x, y: tile.y, remove: false } });
  }
  const afterFounders = snapshotStore(store);
  store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
  store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
  const afterCore = snapshotStore(store);
  store.dispatch({ type: "SIM_STEP", payload: {} });
  const step1 = snapshotStore(store);
  store.dispatch({ type: "SIM_STEP", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
  const step4 = snapshotStore(store);
  assert.equal(afterCore.state.sim.runPhase, "run_active", "main run must be active after genesis confirmations");
  assert.equal(afterCore.state.sim.running, true, "main run must be running after core confirmation");
  assert.equal(afterFounders.state.sim.founderPlaced, 4, "four founders must be committed");
  return {
    seed,
    founderTiles,
    anchors: {
      afterFounders,
      afterCore,
      step1,
      step4,
    },
  };
}

function assertSameSeedReplay(left, right, label) {
  assert.deepEqual(left.founderTiles, right.founderTiles, `${label}: founder placement path must be deterministic`);
  for (const anchor of ["afterCore", "step1", "step4"]) {
    assert.equal(left.anchors[anchor].signature, right.anchors[anchor].signature, `${label}:${anchor} signature drifted`);
    assert.equal(left.anchors[anchor].signatureMaterialHash, right.anchors[anchor].signatureMaterialHash, `${label}:${anchor} signature material drifted`);
    assert.equal(left.anchors[anchor].readModelHash, right.anchors[anchor].readModelHash, `${label}:${anchor} read model drifted`);
  }
}

const sameSeedLeft = runScenario("p0-seed-main");
const sameSeedRight = runScenario("p0-seed-main");
const crossSeed = runScenario("p0-seed-alt");

assertSameSeedReplay(sameSeedLeft, sameSeedRight, "same-seed");
assert.notEqual(sameSeedLeft.anchors.afterCore.signatureMaterialHash, crossSeed.anchors.afterCore.signatureMaterialHash, "cross-seed after-core signature material must diverge");
assert.notEqual(sameSeedLeft.anchors.afterCore.signature, crossSeed.anchors.afterCore.signature, "cross-seed after-core signature must diverge");
assert.notEqual(sameSeedLeft.anchors.step1.readModelHash, crossSeed.anchors.step1.readModelHash, "cross-seed step-1 read model must diverge");
assert.notEqual(sameSeedLeft.anchors.step4.signatureMaterialHash, crossSeed.anchors.step4.signatureMaterialHash, "cross-seed step-4 signature material must diverge");
assert.notEqual(sameSeedLeft.anchors.step4.readModelHash, crossSeed.anchors.step4.readModelHash, "cross-seed step-4 read model must diverge");
assert(sameSeedLeft.anchors.step4.state.sim.tick >= 4, "scenario must advance at least four ticks");

console.log(
  `DETERMINISM_OK seed=${sameSeedLeft.seed} after-core=${sameSeedLeft.anchors.afterCore.signature}:${sameSeedLeft.anchors.afterCore.signatureMaterialHash}:${sameSeedLeft.anchors.afterCore.readModelHash} step-1=${sameSeedLeft.anchors.step1.signature}:${sameSeedLeft.anchors.step1.signatureMaterialHash}:${sameSeedLeft.anchors.step1.readModelHash} step-4=${sameSeedLeft.anchors.step4.signature}:${sameSeedLeft.anchors.step4.signatureMaterialHash}:${sameSeedLeft.anchors.step4.readModelHash} cross-seed=${crossSeed.seed}:${crossSeed.anchors.step4.signatureMaterialHash}:${crossSeed.anchors.step4.readModelHash}`,
);

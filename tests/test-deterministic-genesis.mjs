import assert from "node:assert/strict";

import { bootstrapMainRun, createDeterministicStore, snapshotStore, stepMany } from "./support/liveTestKit.mjs";

function runScenario() {
  const store = createDeterministicStore();
  const founderTiles = bootstrapMainRun(store);
  const afterBootstrap = snapshotStore(store);
  assert.equal(afterBootstrap.state.sim.runPhase, "run_active", "main run must be active after genesis confirmations");
  assert.equal(afterBootstrap.state.sim.running, true, "main run must be running after core confirmation");
  assert.equal(afterBootstrap.state.sim.founderPlaced, 4, "four founders must be committed");
  stepMany(store, 4);
  const finalSnapshot = snapshotStore(store);
  return {
    founderTiles,
    afterBootstrap,
    finalSnapshot,
  };
}

const left = runScenario();
const right = runScenario();

assert.deepEqual(left.founderTiles, right.founderTiles, "founder placement path must be deterministic");
assert.equal(left.afterBootstrap.signature, right.afterBootstrap.signature, "bootstrap signatures drifted");
assert.equal(left.finalSnapshot.signature, right.finalSnapshot.signature, "final signatures drifted");
assert.equal(left.finalSnapshot.signatureMaterialHash, right.finalSnapshot.signatureMaterialHash, "signature material drifted");
assert.equal(left.finalSnapshot.readModelHash, right.finalSnapshot.readModelHash, "read model drifted");
assert.equal(left.finalSnapshot.state.sim.tick, right.finalSnapshot.state.sim.tick, "tick drifted");
assert(left.finalSnapshot.state.sim.tick >= 4, "scenario must advance at least four ticks");

console.log(`DETERMINISM_OK signature=${left.finalSnapshot.signature} readModelHash=${left.finalSnapshot.readModelHash} tick=${left.finalSnapshot.state.sim.tick}`);

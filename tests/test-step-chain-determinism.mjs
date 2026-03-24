import assert from "node:assert/strict";

import { bootstrapMainRun, createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

function runStepChainReplay(seed, stepCount = 4) {
  const store = createDeterministicStore({ seed });
  const founderTiles = bootstrapMainRun(store);
  const anchors = [];
  for (let step = 1; step <= stepCount; step += 1) {
    store.dispatch({ type: "SIM_STEP", payload: {} });
    anchors.push({
      step,
      snapshot: snapshotStore(store),
    });
  }
  return {
    founderTiles,
    anchors,
  };
}

const left = runStepChainReplay("p1-step-seed-main", 4);
const right = runStepChainReplay("p1-step-seed-main", 4);
const cross = runStepChainReplay("p1-step-seed-alt", 4);

assert.deepEqual(left.founderTiles, right.founderTiles, "founder placement path must stay identical across step-chain replays");
assert.equal(left.anchors.length, right.anchors.length, "step-chain replay length must stay identical");
assert.equal(left.anchors.length, cross.anchors.length, "cross-seed replay length must stay identical");

const proofAnchors = [];
let crossPatternDiverged = false;
for (let i = 0; i < left.anchors.length; i += 1) {
  const leftAnchor = left.anchors[i];
  const rightAnchor = right.anchors[i];
  const crossAnchor = cross.anchors[i];
  assert.equal(leftAnchor.step, rightAnchor.step, `step index drifted at replay position ${i}`);
  assert.equal(leftAnchor.snapshot.revisionCount, rightAnchor.snapshot.revisionCount, `step-${leftAnchor.step} revision count drifted`);
  assert.equal(leftAnchor.snapshot.signature, rightAnchor.snapshot.signature, `step-${leftAnchor.step} signature drifted`);
  assert.equal(leftAnchor.snapshot.signatureMaterialHash, rightAnchor.snapshot.signatureMaterialHash, `step-${leftAnchor.step} signature material drifted`);
  assert.equal(leftAnchor.snapshot.readModelHash, rightAnchor.snapshot.readModelHash, `step-${leftAnchor.step} read model drifted`);
  assert.deepEqual(
    leftAnchor.snapshot.state.sim.cellPatternCounts,
    rightAnchor.snapshot.state.sim.cellPatternCounts,
    `step-${leftAnchor.step} cellPatternCounts drifted`,
  );
  assert.equal(
    Number(leftAnchor.snapshot.state.meta.simStepCount || 0),
    Number(rightAnchor.snapshot.state.meta.simStepCount || 0),
    `step-${leftAnchor.step} meta.simStepCount drifted`,
  );
  assert.deepEqual(
    leftAnchor.snapshot.state.sim.runSummary,
    rightAnchor.snapshot.state.sim.runSummary,
    `step-${leftAnchor.step} sim.runSummary drifted`,
  );
  if (
    JSON.stringify(leftAnchor.snapshot.state.sim.cellPatternCounts)
    !== JSON.stringify(crossAnchor.snapshot.state.sim.cellPatternCounts)
  ) {
    crossPatternDiverged = true;
  }
  proofAnchors.push(
    `step-${leftAnchor.step}:${leftAnchor.snapshot.signature}:${leftAnchor.snapshot.signatureMaterialHash}:${leftAnchor.snapshot.readModelHash}:${leftAnchor.snapshot.revisionCount}`,
  );
}
assert.equal(typeof crossPatternDiverged, "boolean", "cross-seed pattern comparison must be computable");

console.log(`STEP_CHAIN_DETERMINISM_OK crossPatternDiverged=${crossPatternDiverged} anchors=${proofAnchors.join(",")}`);

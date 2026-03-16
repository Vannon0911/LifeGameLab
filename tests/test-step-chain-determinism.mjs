import assert from "node:assert/strict";

import { bootstrapMainRun, createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

function runStepChainReplay(stepCount = 4) {
  const store = createDeterministicStore();
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

const left = runStepChainReplay(4);
const right = runStepChainReplay(4);

assert.deepEqual(left.founderTiles, right.founderTiles, "founder placement path must stay identical across step-chain replays");
assert.equal(left.anchors.length, right.anchors.length, "step-chain replay length must stay identical");

const proofAnchors = [];
for (let i = 0; i < left.anchors.length; i += 1) {
  const leftAnchor = left.anchors[i];
  const rightAnchor = right.anchors[i];
  assert.equal(leftAnchor.step, rightAnchor.step, `step index drifted at replay position ${i}`);
  assert.equal(leftAnchor.snapshot.revisionCount, rightAnchor.snapshot.revisionCount, `step-${leftAnchor.step} revision count drifted`);
  assert.equal(leftAnchor.snapshot.signature, rightAnchor.snapshot.signature, `step-${leftAnchor.step} signature drifted`);
  assert.equal(leftAnchor.snapshot.signatureMaterialHash, rightAnchor.snapshot.signatureMaterialHash, `step-${leftAnchor.step} signature material drifted`);
  assert.equal(leftAnchor.snapshot.readModelHash, rightAnchor.snapshot.readModelHash, `step-${leftAnchor.step} read model drifted`);
  proofAnchors.push(
    `step-${leftAnchor.step}:${leftAnchor.snapshot.signature}:${leftAnchor.snapshot.signatureMaterialHash}:${leftAnchor.snapshot.readModelHash}:${leftAnchor.snapshot.revisionCount}`,
  );
}

console.log(`STEP_CHAIN_DETERMINISM_OK anchors=${proofAnchors.join(",")}`);

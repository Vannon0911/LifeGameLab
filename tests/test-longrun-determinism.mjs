import assert from "node:assert/strict";

import { bootstrapMainRun, createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const CHECKPOINT_STEPS = [250, 500, 1000, 1500];

function runLong(seed) {
  const store = createDeterministicStore({ seed });
  bootstrapMainRun(store);
  const checkpoints = [];
  for (let step = 1; step <= CHECKPOINT_STEPS[CHECKPOINT_STEPS.length - 1]; step += 1) {
    store.dispatch({ type: "SIM_STEP", payload: {} });
    if (CHECKPOINT_STEPS.includes(step)) {
      checkpoints.push({ step, snap: snapshotStore(store) });
    }
  }
  return checkpoints;
}

const left = runLong("long-seed-main");
const right = runLong("long-seed-main");
const cross = runLong("long-seed-alt");

assert.equal(left.length, CHECKPOINT_STEPS.length, "longrun checkpoints missing (left)");
assert.equal(right.length, CHECKPOINT_STEPS.length, "longrun checkpoints missing (right)");
assert.equal(cross.length, CHECKPOINT_STEPS.length, "longrun checkpoints missing (cross)");

for (let i = 0; i < left.length; i += 1) {
  const a = left[i];
  const b = right[i];
  assert.equal(a.step, b.step, `same-seed step mismatch at index ${i}`);
  assert.equal(a.snap.signature, b.snap.signature, `same-seed signature drift at step ${a.step}`);
  assert.equal(a.snap.signatureMaterialHash, b.snap.signatureMaterialHash, `same-seed signature material drift at step ${a.step}`);
  assert.equal(a.snap.readModelHash, b.snap.readModelHash, `same-seed read model drift at step ${a.step}`);
  assert.equal(a.snap.revisionCount, b.snap.revisionCount, `same-seed revision drift at step ${a.step}`);
}

const lastMain = left[left.length - 1];
const lastCross = cross[cross.length - 1];
assert.notEqual(lastMain.snap.signatureMaterialHash, lastCross.snap.signatureMaterialHash, "cross-seed longrun signature material must diverge");
assert.notEqual(lastMain.snap.readModelHash, lastCross.snap.readModelHash, "cross-seed longrun read model must diverge");

console.log(
  `LONGRUN_DETERMINISM_OK checkpoints=${left.map((entry) => `${entry.step}:${entry.snap.signature}:${entry.snap.signatureMaterialHash}:${entry.snap.readModelHash}`).join(",")}`,
);

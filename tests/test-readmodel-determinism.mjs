import assert from "node:assert/strict";

import { createDeterministicStore, getPlayerStartWindowSquare, snapshotStore } from "./support/liveTestKit.mjs";

function runReadModelReplay(seed) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "founder_place" } });
  for (const tile of getPlayerStartWindowSquare(store.getState(), 2)) {
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
  return {
    afterFounders,
    afterCore,
    step1,
    step4,
  };
}

const left = runReadModelReplay("p1-readmodel-seed-main");
const right = runReadModelReplay("p1-readmodel-seed-main");
const cross = runReadModelReplay("p1-readmodel-seed-alt");

for (const anchor of ["afterFounders", "afterCore", "step1", "step4"]) {
  assert.equal(left[anchor].readModelHash, right[anchor].readModelHash, `${anchor} read model hash drifted across replays`);
  assert.equal(left[anchor].signature, right[anchor].signature, `${anchor} signature drifted across replays`);
  assert.equal(
    Number(left[anchor].state.meta.simStepCount || 0),
    Number(right[anchor].state.meta.simStepCount || 0),
    `${anchor} meta.simStepCount drifted across replays`,
  );
  assert.deepEqual(
    left[anchor].state.sim.runSummary,
    right[anchor].state.sim.runSummary,
    `${anchor} sim.runSummary drifted across replays`,
  );
  assert.equal(
    typeof cross[anchor].state.meta.simStepCount,
    "number",
    `${anchor} cross-seed meta.simStepCount must stay numeric`,
  );
  assert.equal(
    typeof cross[anchor].state.sim.runSummary,
    "object",
    `${anchor} cross-seed sim.runSummary must stay object`,
  );
}

assert.notEqual(left.afterFounders.readModelHash, left.afterCore.readModelHash, "read model must change between founder placement and core confirmation");
assert.notEqual(left.afterCore.readModelHash, left.step1.readModelHash, "read model must change at step-1");
assert.notEqual(left.step1.readModelHash, left.step4.readModelHash, "read model must change between step-1 and step-4");

console.log(
  `READMODEL_DETERMINISM_OK after-founders=${left.afterFounders.readModelHash} after-core=${left.afterCore.readModelHash} step-1=${left.step1.readModelHash} step-4=${left.step4.readModelHash}`,
);

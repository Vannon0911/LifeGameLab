import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const cycle = {
  name: "cycle",
  gridW: 32,
  gridH: 32,
  tileSize: 4,
  presetId: "river_delta",
};
cycle.self = cycle;

const store = createDeterministicStore({ seed: "mapspec-cycle-rejection" });
const before = snapshotStore(store);

assert.throws(
  () => store.dispatch({ type: "SET_MAPSPEC", payload: { mapSpec: cycle } }),
  /is not allowed/,
  "SET_MAPSPEC must reject cyclic payloads through strict schema validation",
);

const after = snapshotStore(store);
assert.equal(after.signature, before.signature, "cyclic SET_MAPSPEC rejection must keep signature stable");
assert.equal(after.signatureMaterialHash, before.signatureMaterialHash, "cyclic SET_MAPSPEC rejection must keep signature material stable");

console.log("MAPSPEC_CYCLE_REJECTION_OK blocked=cycle_payload");

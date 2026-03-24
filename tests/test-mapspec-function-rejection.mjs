import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const store = createDeterministicStore({ seed: "mapspec-function-rejection" });
const before = snapshotStore(store);

assert.throws(
  () => store.dispatch({
    type: "SET_MAPSPEC",
    payload: {
      mapSpec: {
        name: () => "evil",
        gridW: 32,
        gridH: 32,
        tileSize: 4,
        presetId: "river_delta",
      },
    },
  }),
  /must be string/,
  "SET_MAPSPEC must reject function-valued fields",
);

const after = snapshotStore(store);
assert.equal(after.signature, before.signature, "rejected SET_MAPSPEC must keep signature stable");
assert.equal(after.signatureMaterialHash, before.signatureMaterialHash, "rejected SET_MAPSPEC must keep signature material stable");

console.log("MAPSPEC_FUNCTION_REJECTION_OK blocked=function_field");

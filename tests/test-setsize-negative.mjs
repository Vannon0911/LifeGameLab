import assert from "node:assert/strict";

import { stableStringify } from "../src/kernel/store/signature.js";
import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import { manifest } from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";
import { snapshotStore } from "./support/liveTestKit.mjs";
import { assertNoopDispatchRevisionBump } from "./support/assertNoopRevisionBump.mjs";

const store = createStore(
  manifest,
  { reducer, simStep: simStepPatch },
  { storageDriver: createNullDriver() },
);

const before = snapshotStore(store);
store.dispatch({ type: "SET_SIZE", payload: { w: -3, h: 16 } });
store.dispatch({ type: "SET_SIZE", payload: { w: 0, h: 0 } });
const after = snapshotStore(store);

assert.equal(stableStringify(after.state), stableStringify(before.state), "invalid SET_SIZE inputs must keep state stable");
assert.equal(after.state.meta.gridW, before.state.meta.gridW, "invalid SET_SIZE must not change gridW");
assert.equal(after.state.meta.gridH, before.state.meta.gridH, "invalid SET_SIZE must not change gridH");
assert.equal(after.readModelHash, before.readModelHash, "invalid SET_SIZE must keep read model stable");
assertNoopDispatchRevisionBump(before, after, "invalid SET_SIZE");

console.log("SET_SIZE_NEGATIVE_OK negative+zero rejected_as_noop=true revision_bumped=true");

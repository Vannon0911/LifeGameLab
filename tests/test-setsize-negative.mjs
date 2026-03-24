import assert from "node:assert/strict";

import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import { manifest } from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";
import { snapshotStore } from "./support/liveTestKit.mjs";

const store = createStore(
  manifest,
  { reducer, simStep: simStepPatch },
  { storageDriver: createNullDriver() },
);

const before = snapshotStore(store);
store.dispatch({ type: "SET_SIZE", payload: { w: -3, h: 16 } });
store.dispatch({ type: "SET_SIZE", payload: { w: 0, h: 0 } });
const after = snapshotStore(store);

assert.equal(after.signature, before.signature, "invalid SET_SIZE inputs must be rejected as no-op");
assert.equal(after.state.meta.gridW, before.state.meta.gridW, "invalid SET_SIZE must not change gridW");
assert.equal(after.state.meta.gridH, before.state.meta.gridH, "invalid SET_SIZE must not change gridH");

console.log("SET_SIZE_NEGATIVE_OK negative+zero rejected_as_noop=true");

import assert from "node:assert/strict";

import { stableStringify } from "../src/kernel/store/signature.js";
import { createStore } from "../src/kernel/store/createStore.js";
import { manifest } from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/game/sim/reducer/index.js";
import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const store = createDeterministicStore({ seed: "redteam-kernel-hardening" });
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
  "function-valued MapSpec fields must be rejected",
);

const cycle = {
  name: "redteam-cycle",
  gridW: 32,
  gridH: 32,
  tileSize: 4,
  presetId: "river_delta",
};
cycle.self = cycle;
assert.throws(
  () => store.dispatch({ type: "SET_MAPSPEC", payload: { mapSpec: cycle } }),
  /is not allowed/,
  "cyclic MapSpec payloads must be rejected",
);

store.dispatch({ type: "SET_SIZE", payload: { w: -3, h: 16 } });
store.dispatch({ type: "SET_SIZE", payload: { w: 0, h: 0 } });

const afterAttacks = snapshotStore(store);
assert.equal(afterAttacks.signature, before.signature, "blocked red-team attacks must keep signature stable");
assert.equal(afterAttacks.signatureMaterialHash, before.signatureMaterialHash, "blocked red-team attacks must keep signature material stable");
assert.equal(afterAttacks.state.meta.gridW, before.state.meta.gridW, "blocked red-team attacks must not change gridW");
assert.equal(afterAttacks.state.meta.gridH, before.state.meta.gridH, "blocked red-team attacks must not change gridH");

assert.throws(
  () => stableStringify({ evil: () => "boom" }),
  /non-serializable value at path: value\.evil/,
  "stableStringify must fail closed on function payloads",
);
assert.throws(
  () => stableStringify(cycle),
  /circular reference at path: value\.self/,
  "stableStringify must fail closed on circular payloads",
);

const poisoned = { presetId: "river_delta" };
poisoned.self = poisoned;
const bootStore = createStore(
  manifest,
  { reducer, simStep: simStepPatch },
  {
    storageDriver: {
      load: () => ({
        schemaVersion: manifest.SCHEMA_VERSION,
        updatedAt: 0,
        revisionCount: 0,
        state: {
          meta: {},
          map: {
            activeSource: "mapspec",
            compiledHash: "",
            spec: poisoned,
            validation: {},
          },
          world: {},
          sim: {},
        },
      }),
      save: () => {},
    },
  },
);

const bootState = bootStore.getState();
assert.equal(bootState.meta.seed, "life-light", "poisoned persistence must fall back to safe defaults");
assert.equal(bootState.map.activeSource, "legacy_preset", "poisoned persistence must not preserve mapspec activation");

store.dispatch({
  type: "SET_MAPSPEC",
  payload: {
    mapSpec: {
      name: "redteam-recovery",
      gridW: 32,
      gridH: 32,
      tileSize: 4,
      presetId: "river_delta",
    },
  },
});
store.dispatch({ type: "GEN_WORLD", payload: {} });

const afterRecovery = snapshotStore(store);
assert.equal(afterRecovery.state.map.activeSource, "mapspec", "store must still accept valid MapSpec after blocked attacks");
assert.equal(afterRecovery.state.world.w, 32, "valid recovery path must still compile world width");
assert.equal(afterRecovery.state.world.h, 32, "valid recovery path must still compile world height");

console.log("REDTEAM_KERNEL_HARDENING_OK blocked=function+cycle+size poison=fallback recovery=clean");

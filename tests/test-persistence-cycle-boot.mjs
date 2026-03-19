import assert from "node:assert/strict";

import { createStore } from "../src/kernel/store/createStore.js";
import { manifest } from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

const cycle = { presetId: "river_delta" };
cycle.self = cycle;

const store = createStore(
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
            spec: cycle,
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

const state = store.getState();
assert.equal(state.meta.seed, "life-light", "poisoned persistence must fall back to default state");
assert.equal(state.map.activeSource, "legacy_preset", "poisoned persistence must not preserve invalid map activation");
assert.equal(state.map.spec.version, "gdd_v1_1", "poisoned persistence must recover a safe default map spec");

console.log("PERSISTENCE_CYCLE_BOOT_OK fallback=default_state");

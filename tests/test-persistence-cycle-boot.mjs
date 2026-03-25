import assert from "node:assert/strict";

import { createStore } from "../src/kernel/store/createStore.js";
import { manifest } from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";

const cycle = { presetId: "river_delta" };
cycle.self = cycle;

assert.throws(
  () => createStore(
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
  ),
  /Persisted state failed schema sanitization/,
  "poisoned persistence must hard-fail instead of downgrading to defaults",
);

assert.throws(
  () => createStore(
    manifest,
    { reducer, simStep: simStepPatch },
    {
      storageDriver: {
        load: () => ({
          schemaVersion: manifest.SCHEMA_VERSION - 1,
          updatedAt: 0,
          revisionCount: 0,
          state: {
            meta: {},
            map: {},
            world: {},
            sim: {},
          },
        }),
        save: () => {},
      },
    },
  ),
  /schemaVersion mismatch/,
  "schema mismatches must hard-fail instead of silently resetting state",
);

console.log("PERSISTENCE_CYCLE_BOOT_OK fail-closed=schema+sanitize");

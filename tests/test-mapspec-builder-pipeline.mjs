import assert from "node:assert/strict";

import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const store = createDeterministicStore({ seed: "mapspec-builder-flow" });
store.dispatch({ type: "GEN_WORLD", payload: {} });
const baseline = snapshotStore(store);
const baselineWorldHash = baseline.state.world.mapSpecSnapshot?.compiledHash || "";

store.dispatch({
  type: "SET_MAPSPEC",
  payload: {
    mapSpec: {
      name: "builder-manual",
      presetId: "wet_meadow",
      gridW: 40,
      gridH: 24,
      tileSize: 4,
    },
  },
});
const afterSetMapSpec = snapshotStore(store);
assert.equal(afterSetMapSpec.state.meta.gridW, 40, "SET_MAPSPEC must update meta.gridW");
assert.equal(afterSetMapSpec.state.meta.gridH, 24, "SET_MAPSPEC must update meta.gridH");
assert.equal(afterSetMapSpec.state.world.w, baseline.state.world.w, "SET_MAPSPEC must not rebuild world width directly");
assert.equal(afterSetMapSpec.state.world.h, baseline.state.world.h, "SET_MAPSPEC must not rebuild world height directly");
assert.equal(
  afterSetMapSpec.state.world.mapSpecSnapshot?.compiledHash || "",
  baselineWorldHash,
  "SET_MAPSPEC must keep world mapSpecSnapshot unchanged until GEN_WORLD",
);

store.dispatch({ type: "GEN_WORLD", payload: {} });
const afterMapSpecGen = snapshotStore(store);
assert.equal(afterMapSpecGen.state.world.w, 40, "GEN_WORLD must consume compiled MapSpec width");
assert.equal(afterMapSpecGen.state.world.h, 24, "GEN_WORLD must consume compiled MapSpec height");
assert.notEqual(
  afterMapSpecGen.state.world.mapSpecSnapshot?.compiledHash || "",
  baselineWorldHash,
  "GEN_WORLD must publish a new world mapSpecSnapshot after MapSpec changes",
);

store.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId: "dry_basin" } });
const afterSetWorldPreset = snapshotStore(store);
assert.equal(afterSetWorldPreset.state.map.activeSource, "legacy_preset", "SET_WORLD_PRESET must stay legacy map source");
assert.equal(afterSetWorldPreset.state.world.w, afterMapSpecGen.state.world.w, "SET_WORLD_PRESET must not rebuild world width directly");
assert.equal(afterSetWorldPreset.state.world.h, afterMapSpecGen.state.world.h, "SET_WORLD_PRESET must not rebuild world height directly");
const beforeLegacyGenSnapshot = afterSetWorldPreset.state.world.mapSpecSnapshot?.compiledHash || "";

store.dispatch({ type: "GEN_WORLD", payload: {} });
const afterLegacyGen = snapshotStore(store);
assert.equal(afterLegacyGen.state.meta.worldPresetId, "dry_basin", "GEN_WORLD must sync legacy preset id");
assert.notEqual(
  afterLegacyGen.state.world.mapSpecSnapshot?.compiledHash || "",
  beforeLegacyGenSnapshot,
  "GEN_WORLD must refresh mapSpecSnapshot after legacy preset changes",
);

console.log(
  `MAPSPEC_BUILDER_PIPELINE_OK baseline=${baselineWorldHash} map=${afterMapSpecGen.state.world.mapSpecSnapshot?.compiledHash || ""} legacy=${afterLegacyGen.state.world.mapSpecSnapshot?.compiledHash || ""}`,
);

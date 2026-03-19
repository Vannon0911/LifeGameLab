import assert from "node:assert/strict";

import { compileMapSpec } from "../src/game/sim/mapspec.js";
import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

function runMapSpecScenario(seed, mapSpec) {
  const store = createDeterministicStore({ seed });
  const before = snapshotStore(store);
  const compiled = compileMapSpec(mapSpec, {
    fallback: {
      gridW: before.state.meta.gridW,
      gridH: before.state.meta.gridH,
      presetId: before.state.meta.worldPresetId,
    },
  });

  store.dispatch({ type: "SET_MAPSPEC", payload: { mapSpec } });
  const afterSetMapSpec = snapshotStore(store);
  assert.notEqual(afterSetMapSpec.signature, before.signature, "SET_MAPSPEC must mutate state once Slice B is active");
  assert.equal(afterSetMapSpec.state.map.activeSource, "mapspec", "SET_MAPSPEC must switch the active source to mapspec");
  assert.deepEqual(afterSetMapSpec.state.map.spec, compiled.spec, "SET_MAPSPEC must store the normalized spec");
  assert.deepEqual(afterSetMapSpec.state.map.validation, compiled.validation, "SET_MAPSPEC must store validation metadata");
  assert.equal(afterSetMapSpec.state.map.compiledHash, compiled.compiledHash, "SET_MAPSPEC must store the compiled hash");
  assert.equal(afterSetMapSpec.state.world.mapSpecSnapshot.compiledHash, compiled.snapshot.compiledHash, "SET_MAPSPEC must publish the compiled snapshot");
  assert.equal(afterSetMapSpec.state.meta.gridW, compiled.gridW, "SET_MAPSPEC must sync meta.gridW from the spec");
  assert.equal(afterSetMapSpec.state.meta.gridH, compiled.gridH, "SET_MAPSPEC must sync meta.gridH from the spec");

  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const afterGenWorld = snapshotStore(store);
  assert.equal(afterGenWorld.state.world.w, compiled.gridW, "GEN_WORLD must use the compiled MapSpec width");
  assert.equal(afterGenWorld.state.world.h, compiled.gridH, "GEN_WORLD must use the compiled MapSpec height");
  assert.equal(afterGenWorld.state.meta.worldPresetId, compiled.presetId, "GEN_WORLD must sync the compiled preset to meta.worldPresetId");
  assert.equal(afterGenWorld.state.map.compiledHash, compiled.compiledHash, "GEN_WORLD must preserve the compiled hash");
  assert.equal(afterGenWorld.state.world.mapSpecSnapshot.compiledHash, compiled.snapshot.compiledHash, "GEN_WORLD must preserve the compiled snapshot");

  return { before, compiled, afterSetMapSpec, afterGenWorld };
}

const wetMeadowMapSpec = {
  name: "wet-meadow-main",
  presetId: "wet_meadow",
  gridW: 32,
  gridH: 32,
  tileSize: 4,
};

const dryBasinMapSpec = {
  name: "dry-basin-main",
  presetId: "dry_basin",
  gridW: 32,
  gridH: 32,
  tileSize: 4,
};

const sameSeedLeft = runMapSpecScenario("mapspec-seed-main", wetMeadowMapSpec);
const sameSeedRight = runMapSpecScenario("mapspec-seed-main", wetMeadowMapSpec);
const crossSpec = runMapSpecScenario("mapspec-seed-main", dryBasinMapSpec);

assert.equal(sameSeedLeft.afterSetMapSpec.signature, sameSeedRight.afterSetMapSpec.signature, "same-seed SET_MAPSPEC signature must be deterministic");
assert.equal(sameSeedLeft.afterSetMapSpec.signatureMaterialHash, sameSeedRight.afterSetMapSpec.signatureMaterialHash, "same-seed SET_MAPSPEC signature material must be deterministic");
assert.equal(sameSeedLeft.afterGenWorld.signature, sameSeedRight.afterGenWorld.signature, "same-seed GEN_WORLD signature must be deterministic after SET_MAPSPEC");
assert.equal(sameSeedLeft.afterGenWorld.readModelHash, sameSeedRight.afterGenWorld.readModelHash, "same-seed GEN_WORLD read model must be deterministic after SET_MAPSPEC");
assert.notEqual(sameSeedLeft.afterGenWorld.signatureMaterialHash, crossSpec.afterGenWorld.signatureMaterialHash, "different MapSpec inputs must diverge after GEN_WORLD");

const invalidStore = createDeterministicStore({ seed: "mapspec-invalid" });
invalidStore.dispatch({
  type: "SET_MAPSPEC",
  payload: {
    mapSpec: {
      presetId: "unknown_biome",
      gridW: -5,
      gridH: 9999,
    },
  },
});
const invalidSnapshot = snapshotStore(invalidStore);
assert.equal(invalidSnapshot.state.map.validation.status, "normalized", "invalid MapSpec input must be normalized, not silently accepted");
assert(invalidSnapshot.state.map.validation.issueCount > 0, "invalid MapSpec input must report validation issues");
assert.equal(invalidSnapshot.state.map.spec.presetId, "river_delta", "invalid preset ids must normalize to the canonical fallback");
assert.equal(invalidSnapshot.state.map.spec.gridW, 8, "invalid widths must clamp to the minimum deterministic size");
assert.equal(invalidSnapshot.state.map.spec.gridH, 256, "oversized heights must clamp to the maximum deterministic size");
assert.equal(invalidSnapshot.state.map.spec.name, "", "missing names must sanitize to empty string");

const legacyPresetStore = createDeterministicStore({ seed: "mapspec-legacy" });
legacyPresetStore.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId: "dry_basin" } });
const legacyPresetSnapshot = snapshotStore(legacyPresetStore);
assert.equal(legacyPresetSnapshot.state.map.activeSource, "legacy_preset", "SET_WORLD_PRESET must keep legacy source semantics while syncing MapSpec state");
assert.equal(legacyPresetSnapshot.state.map.spec.presetId, "dry_basin", "SET_WORLD_PRESET must sync the legacy preset into map.spec");
assert.equal(legacyPresetSnapshot.state.world.mapSpecSnapshot.presetId, "dry_basin", "SET_WORLD_PRESET must publish a matching world snapshot");

console.log(
  `MAPSPEC_GEN_WORLD_OK same=${sameSeedLeft.afterGenWorld.signature}:${sameSeedLeft.afterGenWorld.signatureMaterialHash}:${sameSeedLeft.afterGenWorld.readModelHash} cross=${crossSpec.afterGenWorld.signature}:${crossSpec.afterGenWorld.signatureMaterialHash}:${crossSpec.afterGenWorld.readModelHash} invalid=${invalidSnapshot.state.map.validation.summary}`,
);

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-world-presets-determinism.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function snapshot(seed, presetId) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "SET_WORLD_PRESET", payload: { presetId } });
  const state = store.getState();
  return {
    water: Array.from(state.world.water),
    biomeId: Array.from(state.world.biomeId),
    alive: Array.from(state.world.alive),
    lineageId: Array.from(state.world.lineageId),
  };
}

const a = snapshot("preset-det-1", "river_delta");
const b = snapshot("preset-det-1", "river_delta");
assert(JSON.stringify(a.water) === JSON.stringify(b.water), "same seed+preset must keep water bit-identical");
assert(JSON.stringify(a.biomeId) === JSON.stringify(b.biomeId), "same seed+preset must keep biomeId bit-identical");
assert(JSON.stringify(a.alive) === JSON.stringify(b.alive), "same seed+preset must keep spawn alive field bit-identical");
assert(JSON.stringify(a.lineageId) === JSON.stringify(b.lineageId), "same seed+preset must keep spawn lineage field bit-identical");

const c = snapshot("preset-det-1", "dry_basin");
assert(JSON.stringify(a.water) !== JSON.stringify(c.water), "different preset should produce different water field");
assert(JSON.stringify(a.biomeId) !== JSON.stringify(c.biomeId), "different preset should produce different biome field");

console.log("WORLD_PRESET_DETERMINISM_OK water, biomeId, and spawn fields are deterministic");

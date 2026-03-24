import assert from "node:assert/strict";

import { RUN_PHASE } from "../src/game/contracts/ids.js";
import { createDeterministicStore, snapshotStore } from "./support/liveTestKit.mjs";

const store = createDeterministicStore({ seed: "mapspec-builder-phase" });
store.dispatch({ type: "GEN_WORLD", payload: {} });
const baseline = snapshotStore(store);
const tile = { x: 3, y: 4, mode: "light", value: 0.37 };
const tileIdx = tile.y * Number(baseline.state.meta.gridW || 0) + tile.x;

assert.equal(
  baseline.state.sim.runPhase,
  RUN_PHASE.RUN_ACTIVE,
  "initial run phase must stay run_active before any builder toggle",
);

store.dispatch({ type: "SET_MAP_TILE", payload: { ...tile, remove: false } });
const blocked = snapshotStore(store);
assert.equal(
  blocked.signature,
  baseline.signature,
  "SET_MAP_TILE must be blocked outside RUN_PHASE.MAP_BUILDER",
);
assert.equal(
  blocked.state.map.activeSource,
  "legacy_preset",
  "blocked SET_MAP_TILE must not switch the active map source",
);

store.dispatch({ type: "SET_UI", payload: { runPhase: RUN_PHASE.MAP_BUILDER } });
const builderPhase = snapshotStore(store);
assert.equal(
  builderPhase.state.sim.runPhase,
  RUN_PHASE.MAP_BUILDER,
  "SET_UI must be able to enter RUN_PHASE.MAP_BUILDER",
);

store.dispatch({ type: "SET_MAP_TILE", payload: { ...tile, remove: false } });
const afterTile = snapshotStore(store);
assert.notEqual(afterTile.signature, builderPhase.signature, "SET_MAP_TILE must mutate state in builder phase");
assert.equal(afterTile.state.map.activeSource, "mapspec", "SET_MAP_TILE must switch active map source to mapspec");
assert.equal(afterTile.state.map.spec.mode, "manual", "SET_MAP_TILE must force manual map mode");
assert.deepEqual(
  afterTile.state.map.spec.tilePlan[String(tileIdx)],
  { mode: "light", value: 0.37 },
  "SET_MAP_TILE must store tilePlan entry for the chosen tile",
);
assert.equal(
  afterTile.state.world.mapSpecSnapshot?.compiledHash || "",
  baseline.state.world.mapSpecSnapshot?.compiledHash || "",
  "SET_MAP_TILE must not rebuild the world before GEN_WORLD",
);

store.dispatch({ type: "GEN_WORLD", payload: {} });
const afterGen = snapshotStore(store);
assert.equal(
  afterGen.state.sim.runPhase,
  RUN_PHASE.RUN_ACTIVE,
  "GEN_WORLD must reset the run phase back to run_active",
);
assert(
  Math.abs(Number(afterGen.state.world.L?.[tileIdx] ?? NaN) - 0.37) < 1e-6,
  "GEN_WORLD must apply SET_MAP_TILE light override into the regenerated world",
);
assert.notEqual(
  afterGen.state.world.mapSpecSnapshot?.compiledHash || "",
  baseline.state.world.mapSpecSnapshot?.compiledHash || "",
  "GEN_WORLD must publish a new mapSpecSnapshot after builder edits",
);

console.log(
  `MAPSPEC_BUILDER_PHASE_OK phase=${builderPhase.state.sim.runPhase} tile=${tileIdx} value=${afterGen.state.world.L?.[tileIdx] ?? ""}`,
);

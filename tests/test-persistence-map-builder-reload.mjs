import assert from "node:assert/strict";

import { createStore } from "../src/kernel/store/createStore.js";
import { createMetaOnlyWebDriver } from "../src/platform/persistence/webDriver.js";
import { RUN_PHASE } from "../src/game/contracts/ids.js";
import { manifest } from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";
import { installWebStubs } from "./support/installWebStubs.mjs";

const storageKey = "llm_kernel_meta_v1";
const stubs = installWebStubs();

try {
  const storageDriver = createMetaOnlyWebDriver(storageKey);
  const store = createStore(manifest, { reducer, simStep: simStepPatch }, { storageDriver });
  store.dispatch({ type: "SET_SEED", payload: { seed: "persist-builder-reload" } });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const gridW = Number(store.getState().meta.gridW || 0);
  const tileIdx = 6 * gridW + 5;
  store.dispatch({ type: "SET_UI", payload: { runPhase: RUN_PHASE.MAP_BUILDER } });
  store.dispatch({
    type: "SET_MAP_TILE",
    payload: { x: 5, y: 6, mode: "light", value: 0.24, remove: false },
  });

  const raw = stubs.storage.get(storageKey);
  assert.equal(typeof raw, "string", "explicit web persistence must write a JSON payload");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.state.map.activeSource, "mapspec", "persisted payload must keep mapspec activation");
  assert.deepEqual(
    parsed.state.map.spec.tilePlan[String(tileIdx)],
    { mode: "light", value: 0.24 },
    "persisted payload must keep tilePlan edits",
  );

  const reloadStore = createStore(manifest, { reducer, simStep: simStepPatch }, { storageDriver });
  const reloadedState = reloadStore.getState();
  assert.equal(reloadedState.map.activeSource, "mapspec", "reloaded store must restore mapspec activation");
  assert.deepEqual(
    reloadedState.map.spec.tilePlan[String(tileIdx)],
    { mode: "light", value: 0.24 },
    "reloaded store must restore tilePlan from persisted mapspec",
  );

  reloadStore.dispatch({ type: "GEN_WORLD", payload: {} });
  const afterGen = reloadStore.getState();
  assert(
    Math.abs(Number(afterGen.world.L?.[tileIdx] ?? NaN) - 0.24) < 1e-6,
    "reloaded store must regenerate world with the persisted tilePlan override",
  );
  assert.equal(
    afterGen.world.mapSpecSnapshot?.compiledHash || "",
    afterGen.map.compiledHash || "",
    "reloaded GEN_WORLD must compile from the restored mapspec",
  );
} finally {
  stubs.restore();
}

console.log("PERSISTENCE_MAP_BUILDER_RELOAD_OK mapspec tilePlan survives explicit web-driver reload and GEN_WORLD");

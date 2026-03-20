import assert from "node:assert/strict";

import { createStore } from "../src/kernel/store/createStore.js";
import { createMetaOnlyWebDriver, createNullDriver, createWebDriver } from "../src/kernel/store/persistence.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/game/sim/reducer/index.js";
import { BRUSH_MODE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function installWebStubs() {
  const store = new Map();
  const localStorage = {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
  const document = {
    createElement() {
      return {
        set href(_value) {},
        set download(_value) {},
        click() {},
      };
    },
    body: {
      appendChild() {},
      removeChild() {},
    },
  };
  const URL = {
    createObjectURL() {
      return "blob:test";
    },
    revokeObjectURL() {},
  };
  const prev = {
    localStorage: globalThis.localStorage,
    document: globalThis.document,
    URL: globalThis.URL,
  };
  Object.assign(globalThis, { localStorage, document, URL });
  return {
    map: store,
    restore() {
      if (prev.localStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev.localStorage;
      if (prev.document === undefined) delete globalThis.document;
      else globalThis.document = prev.document;
      if (prev.URL === undefined) delete globalThis.URL;
      else globalThis.URL = prev.URL;
    },
  };
}

function createDeterministicStore(storageDriver) {
  return createStore(
    manifest,
    { reducer, simStep: simStepPatch },
    { storageDriver },
  );
}

function bootstrapOneFounder(store) {
store.dispatch({ type: "SET_SEED", payload: { seed: "persist-seed-main" } });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  const state = store.getState();
  const preset = getWorldPreset(state.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, state.world.w, state.world.h);
  store.dispatch({ type: "PLACE_WORKER", payload: { x: range.x0, y: range.y0, remove: false } });
  store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
  store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
}

const nullDriver = createNullDriver();
assert.equal(nullDriver.load(), null, "null driver load must return null");
assert.doesNotThrow(() => nullDriver.save({ any: true }), "null driver save must be no-op");

const stubs = installWebStubs();
try {
  const webKey = "persist-web-key";
  const webDriver = createWebDriver(webKey);
  const webStore = createDeterministicStore(webDriver);
  bootstrapOneFounder(webStore);
  const webRaw = stubs.map.get(webKey);
  assert.equal(typeof webRaw, "string", "web driver must serialize doc into localStorage string");
  const parsedWeb = JSON.parse(webRaw);
  assert.equal(typeof parsedWeb?.state?.world?.alive, "object", "web driver JSON roundtrip stores typed arrays as plain objects");
  assert.equal(ArrayBuffer.isView(parsedWeb?.state?.world?.alive), false, "web driver raw payload must not preserve typed-array view in JSON");

  const metaKey = "persist-meta-key";
  const metaDriver = createMetaOnlyWebDriver(metaKey);
  const metaStore = createDeterministicStore(metaDriver);
metaStore.dispatch({ type: "SET_SEED", payload: { seed: "persist-meta-seed" } });
  metaStore.dispatch({ type: "SET_SIZE", payload: { w: 48, h: 48 } });
metaStore.dispatch({ type: "SET_SPEED", payload: { speed: 30 } });
  metaStore.dispatch({ type: "GEN_WORLD", payload: {} });

  const metaRaw = stubs.map.get(metaKey);
  assert.equal(typeof metaRaw, "string", "meta-only driver must persist payload");
  const parsedMeta = JSON.parse(metaRaw);
  assert.deepEqual(parsedMeta.state.world, {}, "meta-only driver must strip world payload");
  assert.deepEqual(parsedMeta.state.sim, {}, "meta-only driver must strip sim payload");

  const metaReload = createDeterministicStore(metaDriver);
  const reloadedState = metaReload.getState();
  assert.equal(reloadedState.meta.seed, "persist-meta-seed", "meta-only reload must keep seed");
  assert.equal(reloadedState.meta.gridW, 48, "meta-only reload must keep grid width");
  assert.equal(reloadedState.meta.gridH, 48, "meta-only reload must keep grid height");
  assert.equal(reloadedState.meta.speed, 30, "meta-only reload must keep speed");

  stubs.map.set(metaKey, "{ not-json");
  const tamperedReload = createDeterministicStore(metaDriver);
  const tamperedState = tamperedReload.getState();
  assert.equal(typeof tamperedState.meta.seed, "string", "tampered meta payload must fail closed to default seed string");
  assert.notEqual(tamperedState.meta.seed, "persist-meta-seed", "tampered payload must not force stale persisted seed");
} finally {
  stubs.restore();
}

console.log("PERSISTENCE_DRIVERS_OK null+web+meta-only contracts verified with tamper fallback");

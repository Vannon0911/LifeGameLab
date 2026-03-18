import { createHash } from "node:crypto";

import { createStore } from "../../src/kernel/store/createStore.js";
import { createNullDriver } from "../../src/kernel/store/persistence.js";
import { buildLlmReadModel } from "../../src/project/llm/readModel.js";
import * as manifest from "../../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../../src/project/project.logic.js";
import { BRUSH_MODE } from "../../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../../src/game/sim/worldPresets.js";

export function sha256Text(text) {
  return createHash("sha256").update(String(text), "utf8").digest("hex");
}

export function createDeterministicStore(options = {}) {
  const store = createStore(
    manifest,
    { reducer, simStep: simStepPatch },
    { storageDriver: createNullDriver() },
  );
  if (options.seed !== undefined) {
    store.dispatch({ type: "SET_SEED", payload: String(options.seed) });
  }
  return store;
}

export function getPlayerStartWindowSquare(state, size = 2) {
  const preset = getWorldPreset(state.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, state.world.w, state.world.h);
  const tiles = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      tiles.push({ x: range.x0 + x, y: range.y0 + y });
    }
  }
  return tiles;
}

export function bootstrapMainRun(store) {
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  const tiles = getPlayerStartWindowSquare(store.getState(), 2);
  for (const tile of tiles) {
    store.dispatch({ type: "PLACE_CELL", payload: { x: tile.x, y: tile.y, remove: false } });
  }
  store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
  store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
  return tiles;
}

export function stepMany(store, count) {
  for (let i = 0; i < count; i += 1) {
    store.dispatch({ type: "SIM_STEP", payload: {} });
  }
}

export function snapshotStore(store) {
  const state = store.getState();
  const readModel = buildLlmReadModel(state, null);
  const signatureMaterial = store.getSignatureMaterial();
  const doc = store.getDoc();
  return Object.freeze({
    state,
    readModel,
    signature: store.getSignature(),
    signatureHash: sha256Text(store.getSignature()),
    signatureMaterial,
    signatureMaterialHash: sha256Text(signatureMaterial),
    readModelHash: sha256Text(JSON.stringify(readModel)),
    revisionCount: doc.revisionCount,
  });
}


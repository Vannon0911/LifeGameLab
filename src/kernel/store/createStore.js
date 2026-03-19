import { stableStringify, hash32 } from "./signature.js";
import { applyPatches, assertPatchesAllowed } from "./applyPatches.js";
import { sanitizeBySchema } from "../validation/validateState.js";
import { validateActionAgainstSchema } from "../validation/validateAction.js";
import { assertDomainPatchesAllowed } from "../validation/assertDomainPatchesAllowed.js";
import { createRngStreamsScoped } from "../determinism/rng.js";
import { runWithDeterminismGuard, deepFreeze } from "../determinism/runtimeGuards.js";
import { getDefaultDriver } from "./persistence.js";

export function createStore(manifest, project, options = {}) {
  const { SCHEMA_VERSION, stateSchema, actionSchema, mutationMatrix } = manifest;
  assertManifestContracts(manifest);
  const driver = options.storageDriver || getDefaultDriver();
  const adaptAction = typeof options.actionAdapter === "function"
    ? options.actionAdapter
    : (typeof project.adaptAction === "function" ? project.adaptAction : (a) => a);
  if (options.guardDeterminism === false) {
    throw new Error("guardDeterminism cannot be disabled");
  }
  const guardDeterminism = true;

  let listeners = new Set();

  function makeInitialDoc() {
    const clean = sanitizeBySchema({}, stateSchema);
    return { schemaVersion: SCHEMA_VERSION, updatedAt: 0, revisionCount: 0, state: clean };
  }

  function migrateIfNeeded(rawDoc) {
    if (!rawDoc || typeof rawDoc !== "object") return makeInitialDoc();
    if (rawDoc.schemaVersion === SCHEMA_VERSION) {
      return {
        ...rawDoc,
        revisionCount: Number.isFinite(rawDoc.revisionCount) ? (rawDoc.revisionCount | 0) : (rawDoc.updatedAt | 0)
      };
    }
    return makeInitialDoc();
  }

  let _rawDoc; try { _rawDoc = driver.load(); } catch { _rawDoc = null; }
  let doc = migrateIfNeeded(_rawDoc);
  try { doc.state = sanitizeBySchema(doc.state, stateSchema); } catch { doc = makeInitialDoc(); doc.state = sanitizeBySchema(doc.state, stateSchema); }

  function docSignature(d) {
    return hash32(stableStringify({ schemaVersion: d.schemaVersion, state: d.state }));
  }

  function getState() { return cloneDeep(doc.state); }
  function getDoc() { return deepFreeze(cloneDeep(doc)); }
  function getSignature() { return docSignature(doc); }
  function getSignatureMaterial() {
    return stableStringify({ schemaVersion: doc.schemaVersion, state: doc.state });
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { for (const fn of listeners) fn(); }

  function dispatch(action) {
    const adapted = adaptAction(action);
    const clean = validateActionAgainstSchema(actionSchema, adapted);
    const actionAllowed = mutationMatrix[clean.type];
    if (!Array.isArray(actionAllowed)) throw new Error(`Missing mutationMatrix contract: ${clean.type}`);

    const reducerInput = cloneDeep(doc.state);
    const reducerInputSignature = hash32(stableStringify(reducerInput));
    const reducerRng = createRngStreamsScoped(doc.state.meta.seed, `reducer:${clean.type}:${doc.revisionCount}`);
    const patches = runWithDeterminismGuard(
      () => project.reducer(reducerInput, clean, { rng: reducerRng, revisionCount: doc.revisionCount | 0 }),
      { enabled: guardDeterminism, actionType: clean.type, phase: "reducer" }
    );
    if (hash32(stableStringify(reducerInput)) !== reducerInputSignature) {
      throw new Error("Reducer mutated input state");
    }
    const safePatches = clonePatches(patches);

    if (!Array.isArray(patches)) throw new Error("Reducer must return patches array");
    assertPatchesAllowed(safePatches, actionAllowed);
    assertDomainPatchesAllowed(manifest, doc.state, clean.type, safePatches);

    let nextState = applyPatches(doc.state, safePatches);
    nextState = sanitizeBySchema(nextState, stateSchema);

    if (clean.type === "SIM_STEP" && typeof project.simStep === "function") {
      const simInput = cloneDeep(nextState);
      const simInputSignature = hash32(stableStringify(simInput));
      const simRng = createRngStreamsScoped(doc.state.meta.seed, `simStep:${clean.type}:${doc.revisionCount}`);
      const simPatches = runWithDeterminismGuard(
        () => project.simStep(simInput, clean, { rng: simRng }),
        { enabled: guardDeterminism, actionType: clean.type, phase: "simStep" }
      );
      if (hash32(stableStringify(simInput)) !== simInputSignature) {
        throw new Error("simStep mutated input state");
      }
      if (!Array.isArray(simPatches)) throw new Error("simStep must return patches array");
      const safeSimPatches = clonePatches(simPatches);
      assertPatchesAllowed(safeSimPatches, mutationMatrix.SIM_STEP);
      assertDomainPatchesAllowed(manifest, nextState, "SIM_STEP", safeSimPatches);
      if (safeSimPatches.length) {
        nextState = applyPatches(nextState, safeSimPatches);
        nextState = sanitizeBySchema(nextState, stateSchema);
      }
    }

    const nextRevision = (doc.revisionCount | 0) + 1;
    const nextDoc = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: nextRevision,
      revisionCount: nextRevision,
      state: nextState
    };

    deepFreeze(nextDoc.state);
    const persistedDoc = cloneDeep(nextDoc);
    driver.save(persistedDoc);
    doc = nextDoc;
    emit();
    return doc;
  }

  deepFreeze(doc.state);
  return { getState, getDoc, getSignature, getSignatureMaterial, subscribe, dispatch };
}

function assertManifestContracts(manifest) {
  if (!manifest?.actionSchema || !manifest?.mutationMatrix) throw new Error("Manifest invalid");
}

function cloneDeep(value) {
  if (ArrayBuffer.isView(value)) return new value.constructor(value);
  if (Array.isArray(value)) return value.map(cloneDeep);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value)) out[key] = cloneDeep(value[key]);
  return out;
}

function clonePatches(patches) {
  if (!Array.isArray(patches)) return patches;
  return patches.map((patch) => {
    const out = { ...patch };
    if (Object.prototype.hasOwnProperty.call(out, "value")) {
      out.value = cloneDeep(out.value);
    }
    return out;
  });
}

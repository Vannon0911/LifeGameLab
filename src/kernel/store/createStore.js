import { stableStringify, hash32 } from "./signature.js";
import { applyPatches, assertPatchesAllowed } from "./applyPatches.js";
import { sanitizeBySchema } from "../validation/validateState.js";
import { validateActionAgainstSchema } from "../validation/validateAction.js";
import { assertDomainPatchesAllowed } from "../validation/assertDomainPatchesAllowed.js";
import { createRngStreamsScoped } from "../determinism/rng.js";
import { runWithDeterminismGuard, deepFreeze } from "../determinism/runtimeGuards.js";
import { getDefaultDriver } from "./persistence.js";
import { isPlainObject } from "../shared/isPlainObject.js";

export function createStore(runtimeManifest, project, options = {}) {
  const { SCHEMA_VERSION, stateSchema, actionSchema, mutationMatrix } = runtimeManifest;
  const notImplementedActions = resolveNotImplementedActions(runtimeManifest);
  const simStepActionType = resolveSimStepActionType(runtimeManifest);
  const simStepMutationAllowed = mutationMatrix[simStepActionType];
  assertManifestContracts(runtimeManifest);
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
    if (rawDoc == null) return makeInitialDoc();
    if (!isPlainObject(rawDoc)) {
      throw createPersistenceError("Persisted document must be a plain object");
    }
    if (rawDoc.schemaVersion !== SCHEMA_VERSION) {
      throw createPersistenceError(`Persisted schemaVersion mismatch: expected ${SCHEMA_VERSION}, got ${String(rawDoc.schemaVersion)}`);
    }
    if (!Object.prototype.hasOwnProperty.call(rawDoc, "state") || !isPlainObject(rawDoc.state)) {
      throw createPersistenceError("Persisted document state must be a plain object");
    }
    return {
      ...rawDoc,
      revisionCount: Number.isFinite(rawDoc.revisionCount) ? (rawDoc.revisionCount | 0) : (rawDoc.updatedAt | 0)
    };
  }

  let rawDoc;
  try {
    rawDoc = driver.load();
  } catch (error) {
    throw createPersistenceError("Persistence load failed", error);
  }
  let doc = migrateIfNeeded(rawDoc);
  try {
    doc.state = sanitizeBySchema(doc.state, stateSchema);
  } catch (error) {
    throw createPersistenceError("Persisted state failed schema sanitization", error);
  }

  function docSignature(d) {
    return hash32(getDocAttestationMaterial(d));
  }

  function getState() { return cloneDeep(doc.state); }
  function getDoc() { return deepFreeze(cloneDeep(doc)); }
  function getSignature() { return docSignature(doc); }
  function getSignatureMaterial() {
    return getDocAttestationMaterial(doc);
  }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { for (const fn of listeners) fn(); }

  function dispatch(action) {
    const adapted = adaptAction(action);
    const clean = validateActionAgainstSchema(actionSchema, adapted);
    if (notImplementedActions.has(clean.type)) {
      throw createActionNotImplementedError(clean.type);
    }
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
    assertDomainPatchesAllowed({
      manifest: runtimeManifest,
      state: doc.state,
      actionType: clean.type,
      patches: safePatches,
    });

    let nextState = applyPatches(doc.state, safePatches);
    nextState = sanitizeBySchema(nextState, stateSchema);

    if (clean.type === simStepActionType && typeof project.simStep === "function") {
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
      if (!Array.isArray(simStepMutationAllowed)) {
        throw new Error(`Missing mutationMatrix contract: ${simStepActionType}`);
      }
      const safeSimPatches = clonePatches(simPatches);
      assertPatchesAllowed(safeSimPatches, simStepMutationAllowed);
      assertDomainPatchesAllowed({
        manifest: runtimeManifest,
        state: nextState,
        actionType: simStepActionType,
        patches: safeSimPatches,
      });
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

function getDocAttestationMaterial(doc) {
  return stableStringify({
    schemaVersion: doc.schemaVersion,
    revisionCount: doc.revisionCount | 0,
    state: doc.state
  });
}

function createPersistenceError(message, cause) {
  const error = new Error(message);
  if (cause !== undefined) error.cause = cause;
  return error;
}

function createActionNotImplementedError(actionType) {
  const error = new Error(`Action '${actionType}' is scaffolded and not implemented`);
  error.code = "ERR_ACTION_NOT_IMPLEMENTED";
  error.actionType = actionType;
  return error;
}

function assertManifestContracts(manifest) {
  if (!manifest?.actionSchema || !manifest?.mutationMatrix) throw new Error("Manifest invalid");
  if (manifest?.simGate && typeof manifest?.domainPatchGate !== "function") {
    throw new Error("Manifest invalid: runtime manifest with simGate requires domainPatchGate");
  }
}

function resolveNotImplementedActions(manifest) {
  const source = manifest?.notImplementedActions;
  if (!Array.isArray(source)) return new Set();
  return new Set(source.map((value) => String(value || "").trim()).filter(Boolean));
}

function resolveSimStepActionType(manifest) {
  const value = String(manifest?.simStepActionType || "SIM_STEP").trim();
  if (!value) throw new Error("Manifest invalid: simStepActionType must not be empty");
  return value;
}

function cloneDeep(value) {
  return cloneValue(value, "value", new WeakMap(), new WeakSet());
}

function cloneValue(value, path, clones, inProgress) {
  if (value === null) return null;
  const t = typeof value;
  if (t === "string" || t === "boolean") return value;
  if (t === "number") {
    if (!Number.isFinite(value)) throw new Error(`non-cloneable value at path: ${path}`);
    return value;
  }
  if (t === "undefined" || t === "function" || t === "symbol" || t === "bigint") {
    throw new Error(`non-cloneable value at path: ${path}`);
  }
  if (ArrayBuffer.isView(value)) return new value.constructor(value);
  if (Array.isArray(value)) {
    if (inProgress.has(value)) throw new Error(`circular reference at path: ${path}`);
    if (clones.has(value)) return clones.get(value);
    const out = new Array(value.length);
    clones.set(value, out);
    inProgress.add(value);
    try {
      for (let i = 0; i < value.length; i += 1) {
        out[i] = cloneValue(value[i], `${path}[${i}]`, clones, inProgress);
      }
      return out;
    } finally {
      inProgress.delete(value);
    }
  }
  if (!isPlainObject(value)) throw new Error(`non-cloneable value at path: ${path}`);
  if (inProgress.has(value)) throw new Error(`circular reference at path: ${path}`);
  if (clones.has(value)) return clones.get(value);
  const out = {};
  clones.set(value, out);
  inProgress.add(value);
  try {
    for (const key of Object.keys(value)) {
      out[key] = cloneValue(value[key], `${path}.${key}`, clones, inProgress);
    }
    return out;
  } finally {
    inProgress.delete(value);
  }
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

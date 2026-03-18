import { stableStringify, hash32 } from "./signature.js";
import { applyPatches, assertPatchesAllowed } from "./applyPatches.js";
import { sanitizeBySchema } from "../validation/validateState.js";
import { validateActionAgainstSchema } from "../validation/validateAction.js";
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

    const reducerRng = createRngStreamsScoped(doc.state.meta.seed, `reducer:${clean.type}:${doc.revisionCount}`);
    const patches = runWithDeterminismGuard(
      () => project.reducer(doc.state, clean, { rng: reducerRng, revisionCount: doc.revisionCount | 0 }),
      { enabled: guardDeterminism, actionType: clean.type, phase: "reducer" }
    );

    if (!Array.isArray(patches)) throw new Error("Reducer must return patches array");
    assertPatchesAllowed(patches, actionAllowed);

    let nextState = applyPatches(doc.state, patches);
    nextState = sanitizeBySchema(nextState, stateSchema);

    if (clean.type === "SIM_STEP" && typeof project.simStep === "function") {
      const simRng = createRngStreamsScoped(doc.state.meta.seed, `simStep:${clean.type}:${doc.revisionCount}`);
      const simPatches = runWithDeterminismGuard(
        () => project.simStep(nextState, clean, { rng: simRng }),
        { enabled: guardDeterminism, actionType: clean.type, phase: "simStep" }
      );
      if (!Array.isArray(simPatches)) throw new Error("simStep must return patches array");
      assertPatchesAllowed(simPatches, mutationMatrix.SIM_STEP);
      if (simPatches.length) {
        nextState = applyPatches(nextState, simPatches);
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
    driver.save(nextDoc);
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

import { stableStringify } from "./stableStringify.js";
import { hash32 } from "./hash32.js";
import { applyPatches, assertPatchesAllowed } from "./patches.js";
import { sanitizeBySchema } from "./schema.js";
import { createRngStreamsScoped } from "./rng.js";
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

  function validateAction(action) {
    const type = action?.type;
    if (typeof type !== "string") throw new Error("Action.type must be string");
    const schema = actionSchema[type];
    if (!schema) throw new Error(`Unknown action type: ${type}`);
    const cleanPayload = sanitizeBySchema(action.payload ?? {}, schema);
    return { type, payload: cleanPayload };
  }

  function dispatch(action) {
    const adapted = adaptAction(action);
    const clean = validateAction(adapted);
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

export function runWithDeterminismGuard(fn, meta) {
  if (!meta?.enabled) return fn();

  const origRandom = Math.random;
  const OrigDate = globalThis.Date;
  const OrigIntl = globalThis.Intl;
  const OrigPerf = globalThis.performance;
  const OrigCrypto = globalThis.crypto;
  const cryptoRestorers = [];
  const blocked = (name) => () => { throw new Error(`Non-deterministic source blocked: ${name} (${meta.phase}:${meta.actionType})`); };

  Math.random = blocked("Math.random");
  // Block Date.now(), new Date(), Date() — all non-deterministic.
  // Proxy intercepts both construct-trap (new Date()) and get-trap (Date.now).
  const _dateMsg = (sub) => `Non-deterministic source blocked: Date${sub} (${meta.phase}:${meta.actionType})`;
  const BlockedDate = new Proxy(OrigDate, {
    apply()     { throw new Error(_dateMsg("()")); },
    construct() { throw new Error(_dateMsg(" constructor")); },
    get(target, prop) {
      if (prop === "now")   return () => { throw new Error(_dateMsg(".now()")); };
      if (prop === "parse") return target.parse.bind(target);  // deterministic — ok
      if (prop === "UTC")   return target.UTC.bind(target);    // deterministic — ok
      const v = target[prop];
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  globalThis.Date = BlockedDate;
  globalThis.Intl = { DateTimeFormat: blocked("Intl.DateTimeFormat"), NumberFormat: blocked("Intl.NumberFormat") };

  // Block performance.now() and performance.getEntries() during Reducer/SimStep
  if (OrigPerf) {
    globalThis.performance = new Proxy(OrigPerf, {
      get(target, prop) {
        if (prop === "now") return blocked("performance.now()");
        if (prop === "getEntries") return blocked("performance.getEntries()");
        const v = target[prop];
        return typeof v === "function" ? v.bind(target) : v;
      }
    });
  }

  if (OrigCrypto && typeof OrigCrypto === "object") {
    const patchCryptoMethod = (name, marker) => {
      if (typeof OrigCrypto[name] !== "function") return;
      const prev = OrigCrypto[name];
      const replacement = blocked(marker);
      try {
        OrigCrypto[name] = replacement;
      } catch {
        try {
          Object.defineProperty(OrigCrypto, name, {
            configurable: true,
            writable: true,
            value: replacement,
          });
        } catch {
          throw new Error(`Cannot enforce determinism guard for ${marker}`);
        }
      }
      cryptoRestorers.push(() => {
        try {
          OrigCrypto[name] = prev;
        } catch {
          Object.defineProperty(OrigCrypto, name, {
            configurable: true,
            writable: true,
            value: prev,
          });
        }
      });
    };
    patchCryptoMethod("randomUUID", "crypto.randomUUID()");
    patchCryptoMethod("getRandomValues", "crypto.getRandomValues()");
  }

  try {
    return fn();
  } finally {
    globalThis.Date = OrigDate;
    Math.random = origRandom;
    globalThis.Intl = OrigIntl;
    globalThis.performance = OrigPerf;
    for (let i = cryptoRestorers.length - 1; i >= 0; i -= 1) {
      cryptoRestorers[i]();
    }
  }
}

export function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    if (ArrayBuffer.isView(obj)) return obj;
    Object.freeze(obj);
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = obj[key];
      if (prop && typeof prop === "object") deepFreeze(prop);
    }
  }
  return obj;
}

function cloneDeep(value) {
  if (ArrayBuffer.isView(value)) return new value.constructor(value);
  if (Array.isArray(value)) return value.map(cloneDeep);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value)) out[key] = cloneDeep(value[key]);
  return out;
}

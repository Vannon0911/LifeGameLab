// ============================================================
// SimStep Buffer — Precompute SIM_STEP patches during idle time
// ============================================================
//
// Idea:
// - Compute SIM_STEP patches ahead of time on a shadow doc/state.
// - Apply later via APPLY_BUFFERED_SIM_STEP to reduce real-time CPU spikes.
//
// Determinism:
// - Buffer invalidates automatically when store revision changes unexpectedly.
// - Patches are validated by simGate again on apply (in reducer).

import { applyPatches } from "../kernel/patches.js";
import { sanitizeBySchema } from "../kernel/schema.js";
import { createRngStreamsScoped } from "../kernel/rng.js";
import { assertSimPatchesAllowed } from "../../game/sim/gate.js";

function nowMs() {
  return globalThis.performance ? globalThis.performance.now() : Date.now();
}

function getIdle(cb) {
  const ric = globalThis.requestIdleCallback;
  if (typeof ric === "function") {
    return ric(cb, { timeout: 250 });
  }
  return setTimeout(() => cb({ timeRemaining: () => 0, didTimeout: true }), 50);
}

function cancelIdle(id) {
  const cic = globalThis.cancelIdleCallback;
  if (typeof cic === "function") return cic(id);
  clearTimeout(id);
}

export function createSimStepBuffer({ store, manifest, project, maxBufferedSteps = 6 }) {
  const stateSchema = manifest.stateSchema;
  const actionSchema = manifest.actionSchema;
  const actionType = "SIM_STEP";

  let running = false;
  let scheduled = 0;
  let queue = [];
  let shadowDoc = null;
  let generation = 0;

  function clear() {
    queue = [];
    shadowDoc = null;
  }

  function currentDoc() {
    // getDoc() is a frozen clone; safe to use as a checkpoint.
    return store.getDoc();
  }

  function ensureShadow() {
    const doc = currentDoc();
    if (!shadowDoc) {
      shadowDoc = {
        schemaVersion: doc.schemaVersion,
        revisionCount: doc.revisionCount | 0,
        state: doc.state,
      };
      return;
    }
    // If store moved, drop buffer (user interaction or other dispatch happened).
    if ((doc.revisionCount | 0) !== (shadowDoc.revisionCount | 0)) {
      clear();
    }
  }

  function computeOne() {
    ensureShadow();
    if (!shadowDoc) return false;
    if (!shadowDoc.state?.world) return false;

    const seed = shadowDoc.state.meta?.seed || "life-light";
    const rev = shadowDoc.revisionCount | 0;

    // Mirror kernel SIM_STEP action sanitize path (force defaults to false if missing).
    const cleanPayload = sanitizeBySchema({}, actionSchema[actionType]);
    const action = { type: actionType, payload: cleanPayload };

    // Reducer phase (expected to be []).
    const reducerRng = createRngStreamsScoped(seed, `reducer:${actionType}:${rev}`);
    const reducerPatches = project.reducer(shadowDoc.state, action, { rng: reducerRng }) || [];
    if (Array.isArray(reducerPatches) && reducerPatches.length) {
      // If reducer emits anything, include it as part of buffered step.
      assertSimPatchesAllowed(manifest, shadowDoc.state, actionType, reducerPatches);
      shadowDoc.state = sanitizeBySchema(applyPatches(shadowDoc.state, reducerPatches), stateSchema);
    }

    // simStep phase: real simulation patches.
    const simRng = createRngStreamsScoped(seed, `simStep:${actionType}:${rev}`);
    const simPatches = project.simStep(shadowDoc.state, action, { rng: simRng }) || [];
    if (!Array.isArray(simPatches) || simPatches.length === 0) return false;
    assertSimPatchesAllowed(manifest, shadowDoc.state, actionType, simPatches);

    // Enqueue patches for later apply against the same base revision.
    queue.push({ baseRevision: rev, patches: simPatches });

    // Advance shadow state to keep precomputing.
    shadowDoc.state = sanitizeBySchema(applyPatches(shadowDoc.state, simPatches), stateSchema);
    shadowDoc.revisionCount = rev + 1;
    return true;
  }

  function pump(deadline, gen) {
    scheduled = 0;
    if (!running || gen !== generation) return;
    const start = nowMs();
    // Work only while we have time and space.
    while (queue.length < maxBufferedSteps) {
      if (deadline && typeof deadline.timeRemaining === "function") {
        if (!deadline.didTimeout && deadline.timeRemaining() < 6) break;
      } else {
        // Fallback: cap per pump.
        if (nowMs() - start > 8) break;
      }
      const ok = computeOne();
      if (!ok) break;
    }
    // Keep pumping when running.
    if (gen === generation) schedule();
  }

  function schedule() {
    if (!running) return;
    if (scheduled) return;
    const gen = generation;
    scheduled = getIdle((deadline) => pump(deadline, gen));
  }

  function start() {
    generation++;
    running = true;
    schedule();
  }

  function stop() {
    generation++;
    running = false;
    if (scheduled) cancelIdle(scheduled);
    scheduled = 0;
    clear();
  }

  function invalidate() {
    generation++;
    clear();
  }

  function consumeOneOrNull() {
    if (!queue.length) return null;
    const doc = currentDoc();
    const head = queue[0];
    if ((doc.revisionCount | 0) !== (head.baseRevision | 0)) {
      // Out of sync: discard everything.
      clear();
      return null;
    }
    return queue.shift();
  }

  function size() { return queue.length; }

  return { start, stop, invalidate, consumeOneOrNull, size };
}

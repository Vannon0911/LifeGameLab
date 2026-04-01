// @doc-anchor ENGINE-CORE
// @doc-anchor ENGINE-PROOF
// @mut-point MUT-PROOF-COMPARE
//
// Reproduktionsbeweis: Fuehrt denselben Seed + dieselben Actions zweimal aus
// und vergleicht die Fingerprints. Nur PASS_REPRODUCED ist ein gueltiger Erfolg.

import { createEngine } from "../kernel/Engine.js";
import { createFingerprint, constantTimeHexEqual } from "../kernel/fingerprint.js";
import { deepClone } from "../kernel/stateManager.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ENGINE_PROOF] ${message}`);
  }
}

export async function runReproductionProof(options = {}) {
  assert(typeof options.seed === "string" && options.seed.trim().length > 0, "seed fehlt.");
  assert(typeof options.registerModule === "function", "registerModule Funktion fehlt.");
  const ticks = Number.isInteger(options.ticks) && options.ticks > 0 ? options.ticks : 16;
  const actionsPerTick = Array.isArray(options.actionsPerTick) ? options.actionsPerTick : [];

  // -- Lauf A ----------------------------------------------------------------
  const engineA = createEngine({ seed: options.seed });
  options.registerModule(engineA);
  await engineA.initialize();
  const snapshotsA = await engineA.runTicks(ticks, actionsPerTick);
  const fingerprintA = await engineA.createProof(snapshotsA);
  const finalStateA = engineA.getCurrentState();

  // -- Lauf B (identisch) ----------------------------------------------------
  const engineB = createEngine({ seed: options.seed });
  options.registerModule(engineB);
  await engineB.initialize();
  const snapshotsB = await engineB.runTicks(ticks, actionsPerTick);
  const fingerprintB = await engineB.createProof(snapshotsB);
  const finalStateB = engineB.getCurrentState();

  // -- Vergleich -------------------------------------------------------------
  const fingerprintMatch = constantTimeHexEqual(fingerprintA, fingerprintB);
  const stateMatch = JSON.stringify(finalStateA) === JSON.stringify(finalStateB);
  const snapshotMatch = JSON.stringify(snapshotsA) === JSON.stringify(snapshotsB);

  const status = fingerprintMatch && stateMatch && snapshotMatch
    ? "PASS_REPRODUCED"
    : "FAIL_DIVERGED";

  const report = {
    status,
    seed: options.seed,
    ticks,
    fingerprintA,
    fingerprintB,
    fingerprintMatch,
    stateMatch,
    snapshotMatch,
    finalTickA: engineA.getCurrentTick(),
    finalTickB: engineB.getCurrentTick(),
    routerCallsA: engineA.router.callHistory.length,
    routerCallsB: engineB.router.callHistory.length
  };

  return Object.freeze(report);
}

export async function runReproductionSuite(options = {}) {
  assert(typeof options.registerModule === "function", "registerModule Funktion fehlt.");
  const seeds = Array.isArray(options.seeds) && options.seeds.length > 0
    ? options.seeds
    : ["alpha", "beta", "gamma", "delta"];
  const ticks = options.ticks || 16;
  const actionsPerTick = options.actionsPerTick || [];

  const results = [];
  for (const seed of seeds) {
    const report = await runReproductionProof({
      seed,
      ticks,
      actionsPerTick,
      registerModule: options.registerModule
    });
    results.push(report);
  }

  const allPassed = results.every((r) => r.status === "PASS_REPRODUCED");
  const suiteFingerprint = await createFingerprint({
    suite: "reproduction-proof",
    results: results.map((r) => ({
      seed: r.seed,
      status: r.status,
      fingerprintA: r.fingerprintA
    }))
  });

  return Object.freeze({
    status: allPassed ? "SUITE_PASS" : "SUITE_FAIL",
    suiteFingerprint,
    results,
    totalSeeds: seeds.length,
    passedSeeds: results.filter((r) => r.status === "PASS_REPRODUCED").length
  });
}

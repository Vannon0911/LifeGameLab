// @doc-anchor HYGIENE-2.0-CORE
// @doc-anchor TESTLINE-2.0
//
// Stabile Testline-Logik fuer SeedWorld.
// Fuehrt deterministische Tests aus und validiert die Ergebnisse.
// Bietet Funktionen fuer Rebuttal-Logik und Sync-Mechanismen.

import { runReproductionProof } from "../../engine/proof/reproductionProof.js";
import * as gameModule from "../../engine/game/gameModule.js";

/** Fuehrt eine Testline-Ausfuehrung durch. */
export async function runTestline(options = {}) {
  const { seed = "testline-seed", ticks = 16, actionsPerTick = [] } = options;
  const proofReport = await runReproductionProof({
    seed,
    ticks,
    actionsPerTick,
    registerModule: (engine) => engine.registerModule(gameModule)
  });

  return {
    status: proofReport.status,
    fingerprint: proofReport.fingerprintA,
    ticks: proofReport.finalTickA,
    timestamp: new Date().toISOString(),
    ...proofReport
  };
}

/** Validiert die Testline-Ergebnisse gegen eine Baseline. */
export function validateTestline(report, baseline) {
  const { fingerprint, status } = report;
  const { expectedFingerprint, expectedStatus = "PASS_REPRODUCED" } = baseline;

  const valid = status === expectedStatus && fingerprint === expectedFingerprint;
  const reason = !valid ? `Fingerprint mismatch: expected ${expectedFingerprint}, got ${fingerprint}` : "Testline valid.";

  return { valid, reason };
}

/** Erzeugt einen Rebuttal-Eintrag fuer fehlgeschlagene Tests. */
export function createRebuttal(testId, reason, justification) {
  return {
    testId,
    reason,
    justification,
    timestamp: new Date().toISOString(),
    status: "PENDING_REVIEW"
  };
}

/** Synchronisiert die Testline-Ergebnisse mit der Dokumentation. */
export async function syncTestlineResults(results, outputPath) {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");

  const report = {
    version: "2.0.0",
    last_run: new Date().toISOString(),
    results: results.map(r => ({
      testId: r.testId,
      status: r.status,
      fingerprint: r.fingerprint
    }))
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf-8");
  return outputPath;
}

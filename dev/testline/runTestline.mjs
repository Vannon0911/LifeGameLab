#!/usr/bin/env node
// @doc-anchor HYGIENE-2.0-CORE
// @doc-anchor TESTLINE-2.0-RUNNER
//
// CLI-Runner fuer die Testline-Ausfuehrung.
// Fuehrt deterministische Tests aus, validiert die Ergebnisse
// und integriert Rebuttal-Logik.

import { runTestline, validateTestline, syncTestlineResults } from "./testline.mjs";
import { listPendingRebuttals, syncRebuttalsWithTestline } from "../rebuttal/rebuttal.mjs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = process.cwd();
const REPORT_DIR = path.join(REPO_ROOT, "runtime/evidence");
const REPORT_FILE = path.join(REPORT_DIR, "testline-report-2.0.json");
const REBUTTAL_DIR = path.join(REPO_ROOT, "tem/rebuttals");

const CONFIG = {
  seeds: ["testline-seed-1", "testline-seed-2", "testline-seed-3"],
  ticks: 16,
  baseline: {
    expectedStatus: "PASS_REPRODUCED",
    expectedFingerprint: "aeb849aa50c7c60edb4096a5f7b42729b4e7c5573206e3548330908485dce384"
  }
};

async function main() {
  console.log("[TESTLINE 2.0] Starte Testline-Ausfuehrung...");
  console.log(`[TESTLINE 2.0] Repo-Root: ${REPO_ROOT}`);

  const results = [];
  for (const seed of CONFIG.seeds) {
    const report = await runTestline({ seed, ticks: CONFIG.ticks });
    // Nur fuer den ersten Seed validieren wir gegen die Baseline
    const isBaselineSeed = seed === CONFIG.seeds[0];
    const validation = isBaselineSeed ? validateTestline(report, CONFIG.baseline) : { valid: report.status === "PASS_REPRODUCED", reason: "Reproduced." };
    
    results.push({
      testId: `test-${seed}`,
      status: report.status,
      fingerprint: report.fingerprint,
      valid: validation.valid,
      reason: validation.reason
    });
    console.log(`[TESTLINE 2.0] Test '${seed}' -> ${report.status} (${report.fingerprint})`);
  }

  // 1. Rebuttals integrieren
  const pendingRebuttals = await listPendingRebuttals(REBUTTAL_DIR).catch(() => []);
  const syncedResults = await syncRebuttalsWithTestline(pendingRebuttals, results);

  // 2. Ergebnisse synchronisieren
  const reportPath = await syncTestlineResults(syncedResults, REPORT_FILE);
  console.log(`[TESTLINE 2.0] Testline-Report synchronisiert: ${reportPath}`);

  console.log("");
  console.log("=== TESTLINE 2.0 COMPLETED ===");
  console.log(`Status: ${syncedResults.every(r => r.valid || r.status === "PASS_WITH_REBUTTAL") ? "PASS" : "FAIL"}`);
  console.log(`Zeitpunkt: ${new Date().toISOString()}`);
  console.log("");

  if (syncedResults.every(r => r.valid || r.status === "PASS_WITH_REBUTTAL")) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`[TESTLINE 2.0] Fataler Fehler: ${error.message}`);
  process.exit(1);
});

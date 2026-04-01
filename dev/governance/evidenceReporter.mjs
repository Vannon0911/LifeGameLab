import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export async function generateEvidenceReport(context) {
  const { proofReport, moduleReport, sourceReport, evidencePath } = context;
  
  const timestamp = new Date().toISOString();
  const reportId = crypto.randomBytes(8).toString("hex");
  
  const report = {
    report_id: reportId,
    timestamp,
    environment: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    },
    evidence: {
      determinism: {
        status: proofReport.fingerprintMatch ? "VERIFIED" : "FAILED",
        fingerprint_a: proofReport.fingerprintA,
        fingerprint_b: proofReport.fingerprintB,
        match: proofReport.fingerprintMatch,
        ticks_simulated: proofReport.ticks || 16,
        seed_used: proofReport.seed || "unknown",
        attestation: crypto.createHash("sha256").update(proofReport.fingerprintA + proofReport.fingerprintB).digest("hex")
      },
      module_contract: {
        status: moduleReport.valid ? "VERIFIED" : "FAILED",
        exported_keys: moduleReport.keys || [],
        errors: moduleReport.errors || []
      },
      source_hygiene: {
        status: sourceReport.valid ? "VERIFIED" : "FAILED",
        forbidden_refs: sourceReport.forbiddenReferences || [],
        warnings: sourceReport.warnings || []
      }
    },
    integrity_hash: ""
  };

  // Berechne Gesamt-Integritätshash
  const reportString = JSON.stringify(report, null, 2);
  report.integrity_hash = crypto.createHash("sha256").update(reportString).digest("hex");

  const fileName = `evidence-${reportId}.json`;
  const fullPath = path.join(evidencePath, fileName);
  
  await mkdir(evidencePath, { recursive: true });
  await writeFile(fullPath, JSON.stringify(report, null, 2), "utf-8");
  
  // Erstelle einen symbolischen Link oder eine 'latest' Datei
  await writeFile(path.join(evidencePath, "latest-evidence.json"), JSON.stringify(report, null, 2), "utf-8");

  return {
    path: fullPath,
    id: reportId,
    hash: report.integrity_hash
  };
}

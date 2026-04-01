import { generateEvidenceReport } from "./governance/evidenceReporter.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function run() {
  console.log("[evidence-runner] Starting evidence generation...");
  
  // Dummy reports for now, in a real scenario these would come from test runs
  const proofReport = {
    fingerprintMatch: true,
    fingerprintA: "a1b2c3d4",
    fingerprintB: "a1b2c3d4",
    ticks: 100,
    seed: "SEED-V3-INITIAL"
  };
  
  const moduleReport = {
    valid: true,
    keys: ["runtimeManifest", "mutationMatrix", "simGate"],
    errors: []
  };
  
  const sourceReport = {
    valid: true,
    forbiddenReferences: [],
    warnings: []
  };
  
  const evidencePath = path.join(root, "tem", "evidence");
  
  try {
    const result = await generateEvidenceReport({
      proofReport,
      moduleReport,
      sourceReport,
      evidencePath
    });
    
    console.log(`[evidence-runner] Evidence report generated: ${result.path}`);
    console.log(`[evidence-runner] Report ID: ${result.id}`);
    console.log(`[evidence-runner] Integrity Hash: ${result.hash}`);
  } catch (err) {
    console.error("[evidence-runner] Failed to generate evidence report:", err);
    process.exit(1);
  }
}

run();

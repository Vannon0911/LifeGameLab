import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const currentTruthPath = path.join(root, "output", "current-truth.json");

function runNpmScript(name, timeoutMs = 1_800_000) {
  const res = spawnSync(`npm run ${name}`, {
    cwd: root,
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`Verification session failed at npm run ${name} (exit ${res.status})`);
  }
}

function assertLatestFullEvidence() {
  if (!fs.existsSync(currentTruthPath)) {
    throw new Error("Missing output/current-truth.json after verification run.");
  }
  const currentTruth = JSON.parse(fs.readFileSync(currentTruthPath, "utf8"));
  const suite = String(currentTruth?.suite || "");
  const manifestRel = String(currentTruth?.manifestPath || "");
  if (suite !== "full") {
    throw new Error(`Expected latest truth suite 'full', got '${suite || "<empty>"}'.`);
  }
  if (!manifestRel) {
    throw new Error("current-truth.json has no manifestPath.");
  }
  const manifestPath = path.join(root, manifestRel);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Full manifest not found: ${manifestRel}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const outcome = String(manifest?.outcome || "");
  const claimOutcome = String(manifest?.claimStatus?.outcome || "");
  const regressionOutcome = String(manifest?.regressionStatus?.outcome || "");
  if (outcome !== "evidence_match" || claimOutcome !== "match" || regressionOutcome !== "match") {
    throw new Error(
      `Full evidence mismatch: outcome=${outcome}, claims=${claimOutcome}, regression=${regressionOutcome}`,
    );
  }
  console.log(`[verification-session] OK full manifest ${manifestRel}`);
}

function main() {
  runNpmScript("test:quick");
  runNpmScript("test:truth");
  runNpmScript("test:full");
  assertLatestFullEvidence();
  console.log("[verification-session] COMPLETE quick+truth+full all matched.");
}

main();

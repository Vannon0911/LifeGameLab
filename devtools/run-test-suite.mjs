import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPreflightAuditOrThrow } from "./runner-audit.mjs";
import { isKnownSuite, resolveSuiteName } from "./test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const suiteName = resolveSuiteName(process.argv[2] || "claims");
const evidenceRunner = path.join(root, "devtools", "evidence-runner.mjs");

if (!isKnownSuite(suiteName)) {
  console.error(`Unknown suite '${process.argv[2] || "claims"}'. Use quick, claims, regression, or full.`);
  process.exit(2);
}

runPreflightAuditOrThrow();

const res = spawnSync(process.execPath, [evidenceRunner, "--suite", suiteName], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  timeout: 1_200_000,
});

if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);
if (res.error) throw res.error;
process.exit(res.status ?? 1);

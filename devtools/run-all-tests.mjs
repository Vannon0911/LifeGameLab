import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runPreflightAuditOrThrow } from "./runner-audit.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const evidenceRunner = path.join(root, "devtools", "evidence-runner.mjs");

function isDirectExecution() {
  return path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url);
}

export function resolveAggregateSuite(argv = process.argv, lifecycleEvent = process.env.npm_lifecycle_event) {
  const flags = new Set(argv.slice(2).map((arg) => String(arg || "").toLowerCase()));
  if (flags.has("--claims")) return "claims";
  if (flags.has("--quick")) return "quick";
  if (flags.has("--regression")) return "regression";
  if (flags.has("--full")) return "full";

  const event = String(lifecycleEvent || "").toLowerCase();
  if (event === "test:truth") return "claims";
  if (event === "test:quick") return "quick";
  if (event === "test:regression") return "regression";
  return "full";
}

export function runAllTests(argv = process.argv, lifecycleEvent = process.env.npm_lifecycle_event) {
  runPreflightAuditOrThrow();

  const suiteName = resolveAggregateSuite(argv, lifecycleEvent);
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
}

if (isDirectExecution()) {
  runAllTests();
}

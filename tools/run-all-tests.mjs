import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TESTING_PREFLIGHT_PATHS_ARG } from "./test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const preflightScript = path.join(root, "tools", "llm-preflight.mjs");
const evidenceRunner = path.join(root, "tools", "evidence-runner.mjs");

function runPreflightAudit() {
  const res = spawnSync(process.execPath, [preflightScript, "audit", "--paths", TESTING_PREFLIGHT_PATHS_ARG], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) throw res.error;
  if (res.status !== 0) process.exit(res.status ?? 1);
}

runPreflightAudit();

const fullRequested = process.argv.includes("--full") || String(process.env.npm_lifecycle_event || "").toLowerCase() === "test:full";
const suiteName = fullRequested ? "full" : "claims";
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

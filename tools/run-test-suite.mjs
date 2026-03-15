import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_BUDGETS_MS, TEST_SUITES } from "./test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const suiteName = String(process.argv[2] || "quick").toLowerCase();
if (!Object.prototype.hasOwnProperty.call(TEST_SUITES, suiteName)) {
  console.error(`Unknown suite '${suiteName}'. Use one of: ${Object.keys(TEST_SUITES).join(", ")}`);
  process.exit(2);
}

const preflightScript = path.join(root, "tools", "llm-preflight.mjs");
function runPreflight(paths, label = "suite") {
  const steps = [
    ["entry", "--paths", paths, "--mode", "work"],
    ["ack", "--paths", paths],
    ["check", "--paths", paths],
  ];
  for (const args of steps) {
    const preflight = spawnSync(process.execPath, [preflightScript, ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
    if (preflight.stdout) process.stdout.write(preflight.stdout);
    if (preflight.stderr) process.stderr.write(preflight.stderr);
    if (preflight.error) {
      console.error(`[suite:${suiteName}] ${label} llm preflight failed: ${preflight.error.message}`);
      process.exit(1);
    }
    if (preflight.status !== 0) {
      process.exit(preflight.status ?? 1);
    }
  }
}

runPreflight("tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs");

const files = TEST_SUITES[suiteName];
const budgetMs = Number(TEST_BUDGETS_MS[suiteName] || 120_000);
const perCaseTimeoutMs = Math.max(120_000, Math.ceil(budgetMs * 1.2));

const startedAt = Date.now();
for (const rel of files) {
  runPreflight(`${rel},tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs`, `atomic:${rel}`);
  const abs = path.join(root, rel);
  console.log(`Running ${rel}`);
  const res = spawnSync(process.execPath, [abs], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: perCaseTimeoutMs,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) {
    console.error(`[suite:${suiteName}] failed on ${rel}: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) process.exit(res.status ?? 1);
}

const elapsedMs = Date.now() - startedAt;
console.log(`[suite:${suiteName}] OK elapsedMs=${elapsedMs} budgetMs=${budgetMs}`);

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

const files = TEST_SUITES[suiteName];
const budgetMs = Number(TEST_BUDGETS_MS[suiteName] || 120_000);
const perCaseTimeoutMs = Math.max(120_000, Math.ceil(budgetMs * 1.2));

const startedAt = Date.now();
for (const rel of files) {
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

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const testsDir = path.join(root, "tests");
const toolsDir = path.join(root, "tools");

function collectSuite() {
  const tests = readdirSync(testsDir)
    .filter((name) => /^test-.*\.mjs$/.test(name))
    .sort()
    .map((name) => ({
      label: `tests/${name}`,
      file: path.join(testsDir, name),
    }));

  tests.push({
    label: "tools/redteam-stress-master.mjs",
    file: path.join(toolsDir, "redteam-stress-master.mjs"),
  });
  return tests;
}

function runIsolated(label, file) {
  const res = spawnSync(process.execPath, [file], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 300000,
  });

  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);

  if (res.error) {
    return { ok: false, reason: res.error };
  }
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
  return { ok: true };
}

async function runInProcess(suite, fallbackReason) {
  const detail = `${fallbackReason.code || "UNKNOWN"}: ${fallbackReason.message}`;
  console.log(`[test-runner] Falling back to in-process execution (${detail})`);

  let runIndex = 0;
  for (const { label, file } of suite) {
    console.log(`Running ${label}`);
    const moduleUrl = new URL(`?run=${runIndex++}`, pathToFileURL(file));
    await import(moduleUrl.href);
  }
}

const suite = collectSuite();
let fallbackReason = null;
let fallbackIndex = -1;

for (let i = 0; i < suite.length; i++) {
  const entry = suite[i];
  console.log(`Running ${entry.label}`);
  const result = runIsolated(entry.label, entry.file);
  if (!result.ok) {
    fallbackReason = result.reason;
    fallbackIndex = i;
    break;
  }
}

if (fallbackReason) {
  await runInProcess(suite.slice(fallbackIndex), fallbackReason);
}

console.log("ALL_TESTS_OK full suite + redteam passed");

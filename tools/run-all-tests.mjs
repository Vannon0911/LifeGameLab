import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_SUITES } from "./test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
function runSuite(name) {
  const script = path.join(root, "tools", "run-test-suite.mjs");
  const res = spawnSync(process.execPath, [script, name], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600000,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.error) throw res.error;
  if (res.status !== 0) process.exit(res.status ?? 1);
}

for (const name of ["quick", "truth", "stress"]) {
  if (!TEST_SUITES[name]) throw new Error(`Missing test suite '${name}'`);
  runSuite(name);
}

console.log("ALL_TESTS_OK quick + truth + stress passed");

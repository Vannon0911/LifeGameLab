import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import {
  EVIDENCE_POLICY,
  EVIDENCE_SUITES,
  TRACKED_REGRESSION_REPO_TESTS,
  TRACKED_CLAIMS,
  TESTING_PREFLIGHT_PATHS,
  TESTING_PREFLIGHT_PATHS_ARG,
  isKnownSuite,
} from "../tools/test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const matrix = JSON.parse(fs.readFileSync(path.join(root, "docs/llm/TASK_ENTRY_MATRIX.json"), "utf8"));
const testingConfig = matrix.testing;
const testingEntry = fs.readFileSync(path.join(root, "docs/llm/testing/TESTING_TASK_ENTRY.md"), "utf8");
const gateIndex = fs.readFileSync(path.join(root, "docs/llm/entry/TASK_GATE_INDEX.md"), "utf8");
const lock = JSON.parse(fs.readFileSync(path.join(root, "docs/llm/entry/LLM_ENTRY_LOCK.json"), "utf8"));
const entryPath = path.join(root, lock.entryPath);
const entryText = fs.readFileSync(entryPath, "utf8");
const ackPath = path.join(root, ".llm/entry-ack.json");
const sessionPath = path.join(root, ".llm/entry-session.json");

const testingGateFiles = [
  "tools/llm-preflight.mjs",
  "tools/run-test-suite.mjs",
  "tools/run-all-tests.mjs",
  "tests/test-llm-contract.mjs",
  "tests/support/liveTestKit.mjs",
];
const testingScopePaths = [...TESTING_PREFLIGHT_PATHS];

function sha256Text(text) {
  return crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
}

function runPreflight(args) {
  const res = spawnSync(process.execPath, [path.join(root, "tools/llm-preflight.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30000,
  });
  if (res.error) throw res.error;
  assert.equal(res.status, 0, `preflight ${args[0]} failed:\n${res.stdout}\n${res.stderr}`);
  return `${res.stdout}${res.stderr}`;
}

assert.equal(String(testingConfig.requiredEntry || ""), "docs/llm/testing/TESTING_TASK_ENTRY.md", "testing matrix must point to testing task entry");
for (const file of testingGateFiles) {
  assert(testingEntry.includes(file), `testing task entry must reference ${file}`);
  assert(gateIndex.includes(file), `task gate index must reference ${file}`);
  assert(fs.existsSync(path.join(root, file)), `required testing gate file missing: ${file}`);
}

const triggerPrefixes = Array.isArray(testingConfig.triggerPrefixes) ? testingConfig.triggerPrefixes : [];
for (const scopedPath of ["tests/", "tools/llm-preflight.mjs", "tools/run-test-suite.mjs", "tools/run-all-tests.mjs", "tools/test-suites.mjs", "tools/evidence-runner.mjs", "docs/llm/testing/"]) {
  assert(triggerPrefixes.includes(scopedPath), `testing triggerPrefixes must include ${scopedPath}`);
}

const entryHash = sha256Text(entryText);
assert.equal(String(lock.sha256 || ""), entryHash, "entry lock hash must match current ENTRY.md");
const readOrderCount = entryText
  .split(/\r?\n/g)
  .filter((line) => /^\d+\.\s+`.+`/.test(line.trim())).length;
assert.equal(Number(lock.requiredReadOrderCount || 0), readOrderCount, "entry lock read-order count must match current ENTRY.md");

assert(isKnownSuite("claims"), "claims suite must exist");
assert(isKnownSuite("regression"), "regression suite must exist");
assert(isKnownSuite("full"), "full suite must exist");
assert.equal(EVIDENCE_POLICY.scope, "w1", "evidence scope must stay on w1");
assert(TRACKED_CLAIMS.length >= 2, "at least two claim scenarios are required");

const repoTests = fs.readdirSync(path.join(root, "tests"))
  .filter((name) => /^test-.*\.mjs$/.test(name))
  .map((name) => `tests/${name}`)
  .sort();

assert.deepEqual([...TRACKED_REGRESSION_REPO_TESTS].sort(), repoTests, "suite registry must match real repo tests");
assert.deepEqual([...EVIDENCE_SUITES.regression].sort(), repoTests, "regression suite must execute every repo test");

const classifyOutput = runPreflight(["classify", "--paths", TESTING_PREFLIGHT_PATHS_ARG]);
assert(classifyOutput.includes("CLASSIFY_OK task=testing"), "classify must resolve current testing scope to testing");

const entryOutput = runPreflight(["entry", "--paths", TESTING_PREFLIGHT_PATHS_ARG, "--mode", "work"]);
assert(entryOutput.includes("ENTRY_OK task=testing"), "entry must succeed for testing scope");
const sessionBeforeCheck = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
const challengeFileBeforeCheck = path.join(root, sessionBeforeCheck.challengeFile);
assert(fs.existsSync(challengeFileBeforeCheck), "entry must create hidden proof challenge file");

const ackOutput = runPreflight(["ack", "--paths", TESTING_PREFLIGHT_PATHS_ARG]);
assert(ackOutput.includes("ACK_OK task=testing"), "ack must succeed for testing scope");
const ackBeforeCheck = JSON.parse(fs.readFileSync(ackPath, "utf8"));
assert.equal(ackBeforeCheck.tasks.testing.challengeFile, sessionBeforeCheck.challengeFile, "ack challenge file must match active session challenge");
assert.equal(typeof ackBeforeCheck.tasks.testing.proofHash, "string", "ack must store entry proof hash");
assert(ackBeforeCheck.tasks.testing.proofHash.length > 20, "entry proof hash must be non-trivial");

const checkOutput = runPreflight(["check", "--paths", TESTING_PREFLIGHT_PATHS_ARG]);
assert(checkOutput.includes("CHECK_OK task=testing"), "check must succeed for testing scope");

const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
const ack = JSON.parse(fs.readFileSync(ackPath, "utf8"));
assert.equal(session.task, "testing", "session task must be testing");
assert.equal(session.requiredEntry, testingConfig.requiredEntry, "session requiredEntry must match matrix");
assert.equal(session.requiredEntrySha256, sha256Text(testingEntry), "session task entry hash must match current testing entry");
assert.deepEqual((session.classifiedPaths || []).slice().sort(), testingScopePaths.slice().sort(), "session classified paths must match current testing scope");
assert.notEqual(session.challengeFile, sessionBeforeCheck.challengeFile, "check must rotate challenge file path");
assert(fs.existsSync(path.join(root, session.challengeFile)), "rotated challenge file must exist");
assert(!fs.existsSync(challengeFileBeforeCheck), "old challenge file must be removed after successful check");
assert.equal(ack.tasks.testing.requiredEntry, testingConfig.requiredEntry, "ack requiredEntry must match matrix");
assert.equal(ack.tasks.testing.requiredEntrySha256, sha256Text(testingEntry), "ack task entry hash must match current testing entry");
assert.deepEqual((ack.tasks.testing.classifiedPaths || []).slice().sort(), testingScopePaths.slice().sort(), "ack classified paths must match current testing scope");
assert.equal(ack.tasks.testing.challengeFile, session.challengeFile, "ack must auto-sync to rotated challenge file");
assert.equal(ack.tasks.testing.challengeId, session.challengeId, "ack must auto-sync to rotated challenge id");
assert.equal(typeof ack.tasks.testing.proofHash, "string", "ack must keep rotated proof hash");
assert.notEqual(ack.tasks.testing.proofHash, ackBeforeCheck.tasks.testing.proofHash, "proof hash must rotate after verification");

console.log("LLM_CONTRACT_OK testing preflight classify+entry+ack+check synced to matrix, entry lock, hidden proof rotation, and live scope");

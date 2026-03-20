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
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(fs.readFileSync(path.join(root, "docs/llm/entry/LLM_ENTRY_LOCK.json"), "utf8"));
const entryPath = path.join(root, lock.entryPath);
const entryText = fs.readFileSync(entryPath, "utf8");
const ackPath = path.join(root, ".llm/entry-ack.json");
const sessionPath = path.join(root, ".llm/entry-session.json");
const proofDir = path.join(root, ".llm/entry-proof");
const llmDir = path.join(root, ".llm");

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

function backupPath(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const stats = fs.statSync(absPath);
  if (stats.isDirectory()) {
    return {
      kind: "dir",
      entries: fs.readdirSync(absPath, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        value: backupPath(path.join(absPath, entry.name)),
      })),
    };
  }
  return {
    kind: "file",
    data: fs.readFileSync(absPath),
  };
}

function restorePath(absPath, snapshot) {
  fs.rmSync(absPath, { recursive: true, force: true });
  if (!snapshot) return;
  if (snapshot.kind === "file") {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, snapshot.data);
    return;
  }
  fs.mkdirSync(absPath, { recursive: true });
  for (const entry of snapshot.entries) {
    restorePath(path.join(absPath, entry.name), entry.value);
  }
}

const llmBackup = backupPath(llmDir);

try {
  fs.rmSync(ackPath, { force: true });
  fs.rmSync(sessionPath, { force: true });
  fs.rmSync(proofDir, { recursive: true, force: true });

  assert.equal(String(testingConfig.requiredEntry || ""), "docs/llm/testing/TESTING_TASK_ENTRY.md", "testing matrix must point to testing task entry");
  assert(Array.isArray(matrix.testing.dependsOn), "testing scope must declare dependsOn for multi-scope classification");
  assert(matrix.testing.dependsOn.includes("contracts"), "testing scope must include contracts dependency");
  assert(entryText.includes("classify -> entry -> ack -> check"), "ENTRY.md must define the preflight chain for writes");

  for (const file of testingGateFiles) {
    assert(testingEntry.includes(file), `testing task entry must reference ${file}`);
    assert(gateIndex.includes(file), `task gate index must reference ${file}`);
    assert(fs.existsSync(path.join(root, file)), `required testing gate file missing: ${file}`);
  }

  const triggerPrefixes = Array.isArray(testingConfig.triggerPrefixes) ? testingConfig.triggerPrefixes : [];
  for (const scopedPath of ["tests/", "tools/llm-preflight.mjs", "tools/run-test-suite.mjs", "tools/run-all-tests.mjs", "tools/test-suites.mjs", "tools/evidence-runner.mjs", "docs/llm/testing/"]) {
    assert(triggerPrefixes.includes(scopedPath), `testing triggerPrefixes must include ${scopedPath}`);
  }

  const testingPreflightPaths = [
    "tests/",
    "tools/llm-preflight.mjs",
    "tools/run-test-suite.mjs",
    "tools/run-all-tests.mjs",
    "tools/test-suites.mjs",
    "tools/evidence-runner.mjs",
  ];
  for (const scriptName of ["llm:preflight:start", "llm:preflight:ack", "llm:preflight:check"]) {
    const script = String(packageJson.scripts?.[scriptName] || "");
    assert(script.length > 0, `${scriptName} must be defined in package.json`);
    for (const scopedPath of testingPreflightPaths) {
      assert(script.includes(scopedPath), `${scriptName} must include ${scopedPath}`);
    }
  }
  assert(
    String(packageJson.scripts?.["test:contracts"] || "") === "node tests/test-llm-contract.mjs && node tests/test-slice-a-contract-scaffold.mjs",
    "test:contracts must run the contract gate pair",
  );

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

  const bannedLegacyAction = ["PLACE", "CELL"].join("_");
  const placeCellRefs = [];
  for (const relPath of repoTests) {
    const text = fs.readFileSync(path.join(root, relPath), "utf8");
    if (text.includes(bannedLegacyAction)) placeCellRefs.push(relPath);
  }
  assert.deepEqual(placeCellRefs, [], "tests must not reference legacy worker placement after removal");

  const classifyOutput = runPreflight(["classify", "--paths", TESTING_PREFLIGHT_PATHS_ARG]);
  assert(classifyOutput.includes("CLASSIFY_OK"), "classify must succeed for testing scope");
  assert(classifyOutput.includes("scope=contracts+testing"), "testing classification must expand contracts dependency");

  const testingDirClassify = runPreflight(["classify", "--paths", "tests/"]);
  assert(testingDirClassify.includes("scope=contracts+testing"), "directory root tests/ must classify as testing scope");

  const testingDocsDirClassify = runPreflight(["classify", "--paths", "docs/llm/testing/"]);
  assert(testingDocsDirClassify.includes("scope=contracts+testing"), "directory root docs/llm/testing/ must classify as testing scope");

  const hooksDirClassify = runPreflight(["classify", "--paths", ".githooks/"]);
  assert(hooksDirClassify.includes("scope=contracts+testing"), "directory root .githooks/ must classify as testing scope");

  const multiClassify = runPreflight(["classify", "--paths", "src/game/ui/ui.js,src/game/sim/step.js"]);
  assert(multiClassify.includes("scope=contracts+sim+ui"), "classify must support multi-scope dependency expansion");

  const entryOutput = runPreflight(["entry", "--paths", TESTING_PREFLIGHT_PATHS_ARG, "--mode", "work"]);
  assert(entryOutput.includes("ENTRY_OK scope=contracts+testing"), "entry must succeed for expanded testing scope");
  const sessionBeforeCheck = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
  const challengeFileBeforeCheck = path.join(root, sessionBeforeCheck.challengeFile);
  assert(fs.existsSync(challengeFileBeforeCheck), "entry must create hidden proof challenge file");

  const ackOutput = runPreflight(["ack", "--paths", TESTING_PREFLIGHT_PATHS_ARG]);
  assert(ackOutput.includes("ACK_OK scope=contracts+testing"), "ack must succeed for expanded testing scope");

  const changedPathSet = "tests,tools/llm-preflight.mjs";
  const checkAutoOutput = runPreflight(["check", "--paths", changedPathSet]);
  assert(checkAutoOutput.includes("AUTO_RECLASSIFY"), "check must auto-reclassify on path drift");
  assert(checkAutoOutput.includes("CHECK_OK"), "check must still complete after auto-reclassify");

  const checkOutput = runPreflight(["check", "--paths", TESTING_PREFLIGHT_PATHS_ARG]);
  assert(checkOutput.includes("CHECK_OK"), "check must succeed again for full testing scope");

  const auditOutput = runPreflight(["audit", "--paths", "src/unknown/not-in-matrix.js"]);
  assert(auditOutput.includes("AUDIT_OK"), "audit must never block the caller");
  assert(auditOutput.includes("AUDIT_WARN"), "audit must report warnings for preflight violations");

  const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
  const ack = JSON.parse(fs.readFileSync(ackPath, "utf8"));
  assert.equal(session.scopeKey, "contracts+testing", "session scope key must keep expanded testing scope");
  assert.deepEqual((session.taskScope || []).slice().sort(), ["contracts", "testing"], "session taskScope must be multi-scope array");
  assert.deepEqual((session.classifiedPaths || []).slice().sort(), testingScopePaths.slice().sort(), "session classified paths must match current testing scope");
  assert.equal(typeof ack.scopes["contracts+testing"].proofHash, "string", "ack must store proof hash per scope key");
  assert(ack.scopes["contracts+testing"].proofHash.length > 20, "proof hash must be non-trivial");

  console.log("LLM_CONTRACT_OK multi-scope classify+dependency expansion+auto-reclassify enabled and audit mode keeps tests unblocked");
} finally {
  restorePath(llmDir, llmBackup);
}

import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-llm-contract.mjs");
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertLlmGateSync } from "../src/project/llm/gateSync.js";
import { createLlmCommandAdapter, ACTION_ENVELOPE } from "../src/project/llm/commandAdapter.js";
import { buildLlmReadModel } from "../src/project/llm/readModel.js";
import { manifest } from "../src/project/project.manifest.js";
import { WIN_MODE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertContains(text, needle, msg) {
  assert(text.includes(needle), msg);
}

function assertHasAnyMarker(text, markers, msg) {
  const payload = String(text || "");
  assert(markers.some((marker) => payload.includes(marker)), `${msg}. got='${payload.trim()}'`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const nodeBin = process.execPath;
const preflightScript = path.join(root, "tools", "llm-preflight.mjs");

function runPreflight(args) {
  const res = spawnSync(nodeBin, [preflightScript, ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  });
  if (res.error) throw res.error;
  return {
    status: Number(res.status ?? 1),
    stdout: String(res.stdout || ""),
    stderr: String(res.stderr || ""),
  };
}

{
  const ok = runPreflight([
    "classify",
    "--paths",
    "tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs",
  ]);
  assert(ok.status === 0, `preflight classify should pass, got status=${ok.status} stderr=${ok.stderr}`);
  assertContains(ok.stdout, "CLASSIFY_OK", "preflight classify output missing CLASSIFY_OK");
  assertContains(ok.stdout, "task=testing", "preflight classify must resolve task=testing");
}

{
  const ambiguous = runPreflight(["classify", "--paths", "tests/test-smoke.mjs,src/game/ui/ui.js"]);
  assert(ambiguous.status !== 0, `ambiguous classify should fail, got status=${ambiguous.status}`);
  assertHasAnyMarker(
    ambiguous.stderr || ambiguous.stdout,
    ["Ambiguous task classification", "[llm-preflight]"],
    "ambiguous classify must emit an error marker",
  );
}

{
  const outside = runPreflight(["classify", "--paths", "C:/Windows"]);
  assert(outside.status !== 0, `outside-repo classify should fail, got status=${outside.status}`);
  assertHasAnyMarker(
    outside.stderr || outside.stdout,
    ["Path outside repository is not allowed", "[llm-preflight]"],
    "outside-repo classify must emit an error marker",
  );
}

{
  const check = runPreflight([
    "check",
    "--paths",
    "tests/,tools/llm-preflight.mjs,tools/run-test-suite.mjs,tools/run-all-tests.mjs",
  ]);
  assert(check.status === 0, `preflight check should pass for testing task, got status=${check.status} stderr=${check.stderr}`);
  assertContains(check.stdout, "CHECK_OK", "preflight check output missing CHECK_OK");
  assertContains(check.stdout, "task=testing", "preflight check must validate task=testing");
}

{
  const contractIds = runPreflight(["classify", "--paths", "src/game/contracts/ids.js"]);
  assert(contractIds.status === 0, `contract ids classify should pass, got status=${contractIds.status} stderr=${contractIds.stderr}`);
  assertContains(contractIds.stdout, "task=contracts", "contract ids classify must resolve task=contracts");
}

{
  const appMain = runPreflight(["classify", "--paths", "src/app/main.js"]);
  assert(appMain.status === 0, `app main classify should pass, got status=${appMain.status} stderr=${appMain.stderr}`);
  assertContains(appMain.stdout, "task=ui", "app main classify must resolve task=ui");
}

{
  const statusDoc = runPreflight(["classify", "--paths", "docs/STATUS.md"]);
  assert(statusDoc.status === 0, `status doc classify should pass, got status=${statusDoc.status} stderr=${statusDoc.stderr}`);
  assertContains(statusDoc.stdout, "task=versioning", "status doc classify must resolve task=versioning");
}

{
  const topLevelDocs = runPreflight(["classify", "--paths", "docs/WORKFLOW.md,docs/ARCHITECTURE.md"]);
  assert(topLevelDocs.status === 0, `top-level docs classify should pass, got status=${topLevelDocs.status} stderr=${topLevelDocs.stderr}`);
  assertContains(topLevelDocs.stdout, "task=versioning", "top-level docs classify must resolve task=versioning");
}

{
  const mismatch = runPreflight([
    "check",
    "--task",
    "contracts",
    "--paths",
    "tests/test-smoke.mjs",
  ]);
  assert(mismatch.status !== 0, `preflight task mismatch should fail, got status=${mismatch.status}`);
  assertHasAnyMarker(
    mismatch.stderr || mismatch.stdout,
    ["Task mismatch", "task=", "[llm-preflight]"],
    "preflight task mismatch must emit an error marker",
  );
}

const protocolFiles = [
  "docs/WORKFLOW.md",
  "docs/llm/OPERATING_PROTOCOL.md",
  "docs/llm/ui/UI_TASK_ENTRY.md",
  "docs/llm/sim/SIM_TASK_ENTRY.md",
  "docs/llm/contracts/CONTRACT_TASK_ENTRY.md",
  "docs/llm/testing/TESTING_TASK_ENTRY.md",
  "docs/llm/versioning/VERSIONING_TASK_ENTRY.md",
];
for (const rel of protocolFiles) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  assertContains(text, "LESEN", `${rel} missing LESEN phase`);
  assertContains(text, "PRUEFEN", `${rel} missing PRUEFEN phase`);
  assertContains(text, "SCHREIBEN", `${rel} missing SCHREIBEN phase`);
  assertContains(text, "DOKU", `${rel} missing DOKU phase`);
}

const uiTaskEntry = fs.readFileSync(path.join(root, "docs/llm/ui/UI_TASK_ENTRY.md"), "utf8");
assertContains(uiTaskEntry, "src/app/main.js", "UI task entry must mention src/app/main.js for caller/orchestration work");

const mandatoryReading = fs.readFileSync(path.join(root, "MANDATORY_READING.md"), "utf8");
assertContains(mandatoryReading, "docs/WORKFLOW.md", "MANDATORY_READING must redirect to WORKFLOW");

const statusDoc = fs.readFileSync(path.join(root, "docs/STATUS.md"), "utf8");
assertContains(statusDoc, "Fallback", "STATUS fallback policy missing");

const sync = assertLlmGateSync(manifest);
assert(sync.policySource === "docs/llm/ENTRY.md", "LLM policy source drift");
assert(Array.isArray(sync.invariants) && sync.invariants.length >= 3, "LLM invariants missing");

const adapt = createLlmCommandAdapter();
const plain = adapt({ type: ACTION_ENVELOPE, payload: { action: { type: "SET_SPEED", payload: 7 } } });
assert(plain.type === "SET_SPEED", "adapter did not unwrap action");
assert(plain.payload === 7 || Number(plain.payload) === 7, "adapter payload drift");

const sampleState = {
  meta: {
    brushMode: "observe",
    playerLineageId: 1,
    cpuLineageId: 2,
    placementCostEnabled: true,
    activeOverlay: "none",
    physics: { Emax: 3.2 },
    ui: { showRemoteAttackOverlay: true, showDefenseOverlay: true },
  },
  world: {
    w: 4,
    h: 4,
    alive: new Uint8Array(16),
    lineageId: new Uint32Array(16),
    zoneMap: new Int8Array(16),
    E: new Float32Array(16),
    L: new Float32Array(16),
    R: new Float32Array(16),
    W: new Float32Array(16),
    Sat: new Float32Array(16),
    P: new Float32Array(16),
    reserve: new Float32Array(16),
    link: new Float32Array(16),
    clusterField: new Float32Array(16),
    actionMap: new Uint8Array(16),
    lineageMemory: { 1: { doctrine: "equilibrium", techs: ["light_harvest"], synergies: [] } },
  },
  sim: {
    tick: 12,
    running: false,
    playerStage: 2,
    playerDNA: 9,
    playerAliveCount: 4,
    cpuAliveCount: 3,
    playerEnergyNet: -1.5,
    clusterRatio: 0.31,
    networkRatio: 0.10,
    goal: "harvest_secure",
    lossStreakTicks: 0,
    meanToxinField: 0.2,
    aliveRatio: 0.2,
    winMode: WIN_MODE.SUPREMACY,
  },
};
const readModel = buildLlmReadModel(sampleState, { phase: "idle" });
assert(readModel.tick === 12, "read model tick mismatch");
assert(readModel.structure === "biomodule_2x2", "read model structure mismatch");
assert(readModel.mission === "harvest_secure", "read model goal mismatch");
assert(readModel.status?.structure === "biomodule_2x2", "status.structure mismatch");
assert(readModel.status?.goal === "harvest_secure", "status.goal mismatch");
assert(readModel.runIdentity?.doctrine === "equilibrium", "runIdentity.doctrine mismatch");
assert(Array.isArray(readModel.advisor?.reasonCodes), "advisor.reasonCodes missing");
assert(typeof readModel.advisor?.nextAction === "string", "advisor.nextAction missing");
assert(readModel.winProgress?.mode === WIN_MODE.SUPREMACY, "winProgress.mode mismatch");
assert(readModel.benchmark?.phase === "idle", "read model benchmark mismatch");

console.log("LLM_CONTRACT_OK preflight behavior + doc phase gates + adapter/readModel contracts verified");

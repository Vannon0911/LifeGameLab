import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-llm-contract.mjs");
import fs from "node:fs";
import path from "node:path";
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

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const suiteRunner = fs.readFileSync(path.join(root, "tools", "run-test-suite.mjs"), "utf8");
assertContains(suiteRunner, "llm-preflight.mjs", "suite preflight wiring missing");
assertContains(suiteRunner, "--paths", "suite preflight must classify task by paths");
assertContains(suiteRunner, '"check"', "suite preflight check mode missing");

const allRunner = fs.readFileSync(path.join(root, "tools", "run-all-tests.mjs"), "utf8");
assertContains(allRunner, "llm-preflight.mjs", "run-all-tests preflight wiring missing");
assertContains(allRunner, "--paths", "run-all-tests preflight must classify task by paths");

const preflightScript = fs.readFileSync(path.join(root, "tools", "llm-preflight.mjs"), "utf8");
assertContains(preflightScript, "classify", "preflight classify command missing");
assertContains(preflightScript, "requiredEntrySha256", "task entry hash check missing");
assertContains(preflightScript, "Ambiguous task classification", "ambiguous task guard missing");
assertContains(preflightScript, "Task classification requires '--paths", "paths-required guard missing");

const protocolFiles = [
  "docs/START_HERE.md",
  "docs/LLM_OPERATING_PROTOCOL.md",
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

const mandatoryReading = fs.readFileSync(path.join(root, "MANDATORY_READING.md"), "utf8");
assertContains(mandatoryReading, "docs/START_HERE.md", "MANDATORY_READING must redirect to START_HERE");

const masterLog = fs.readFileSync(path.join(root, "docs/MASTER_CHANGE_LOG.md"), "utf8");
assertContains(masterLog, "Fallback", "MASTER_CHANGE_LOG fallback policy missing");

const sync = assertLlmGateSync(manifest);
assert(sync.policySource === "docs/LLM_ENTRY.md", "LLM policy source drift");
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

console.log("LLM_CONTRACT_OK");

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

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const suiteRunner = fs.readFileSync(path.join(root, "tools", "run-test-suite.mjs"), "utf8");
assert(suiteRunner.includes("llm-preflight.mjs"), "suite preflight wiring missing");
assert(suiteRunner.includes('"check"') || suiteRunner.includes("'check'"), "suite preflight check mode missing");

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

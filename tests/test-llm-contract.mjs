import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-llm-contract.mjs");
import { assertLlmGateSync } from "../src/project/llm/gateSync.js";
import { createLlmCommandAdapter, ACTION_ENVELOPE } from "../src/project/llm/commandAdapter.js";
import { buildLlmReadModel } from "../src/project/llm/readModel.js";
import { manifest } from "../src/project/project.manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const sync = assertLlmGateSync(manifest);
assert(sync.policySource === "docs/LLM_ENTRY.md", "LLM policy source drift");
assert(Array.isArray(sync.invariants) && sync.invariants.length >= 3, "LLM invariants missing");

const adapt = createLlmCommandAdapter();
const plain = adapt({ type: ACTION_ENVELOPE, payload: { action: { type: "SET_SPEED", payload: 7 } } });
assert(plain.type === "SET_SPEED", "adapter did not unwrap action");
assert(plain.payload === 7 || Number(plain.payload) === 7, "adapter payload drift");

const sampleState = {
  meta: { brushMode: "observe", playerLineageId: 1 },
  world: { lineageMemory: { 1: { doctrine: "equilibrium", techs: ["light_harvest"], synergies: [] } } },
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
  },
};
const readModel = buildLlmReadModel(sampleState, { phase: "idle" });
assert(readModel.tick === 12, "read model tick mismatch");
assert(readModel.structure === "biomodule_2x2", "read model structure mismatch");
assert(readModel.mission === "harvest_secure", "read model goal mismatch");
assert(readModel.benchmark?.phase === "idle", "read model benchmark mismatch");

console.log("LLM_CONTRACT_OK");

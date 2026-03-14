import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-bootstrap-gen-world.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { buildAdvisorModel } from "../src/project/llm/advisorModel.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "bootstrap-world-check" });
store.dispatch({ type: "GEN_WORLD" });

const state = store.getState();
const advisor = buildAdvisorModel(state);

assert(Number(state.sim.aliveCount || 0) > 0, `aliveCount stayed empty: ${state.sim.aliveCount}`);
assert(Number(state.sim.playerAliveCount || 0) > 0, `playerAliveCount stayed empty: ${state.sim.playerAliveCount}`);
assert(Number(state.sim.cpuAliveCount || 0) > 0, `cpuAliveCount stayed empty: ${state.sim.cpuAliveCount}`);
assert(Number(state.sim.meanWaterField || 0) > 0, `meanWaterField stayed empty: ${state.sim.meanWaterField}`);
assert(advisor.advisor.bottleneckPrimary !== "collapse", `bootstrap still reports collapse: ${advisor.advisor.bottleneckPrimary}`);

console.log("BOOTSTRAP_GEN_WORLD_OK generated world carries non-zero bootstrap sim metrics");

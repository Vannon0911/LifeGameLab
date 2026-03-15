import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-bootstrap-gen-world.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { buildAdvisorModel } from "../src/project/llm/advisorModel.js";
import { GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "bootstrap-world-check" });
store.dispatch({ type: "GEN_WORLD" });

const state = store.getState();
assert(state.meta.gameMode === GAME_MODE.GENESIS, `gameMode drift: ${state.meta.gameMode}`);
assert(state.sim.runPhase === RUN_PHASE.GENESIS_SETUP, `runPhase drift: ${state.sim.runPhase}`);
assert(state.sim.running === false, "GENESIS bootstrap must stay paused");
assert(Number(state.sim.aliveCount || 0) === 0, `aliveCount must be 0 in genesis: ${state.sim.aliveCount}`);
assert(Number(state.sim.playerAliveCount || 0) === 0, `playerAliveCount must be 0 in genesis: ${state.sim.playerAliveCount}`);
assert(Number(state.sim.cpuAliveCount || 0) === 0, `cpuAliveCount must be 0 in genesis: ${state.sim.cpuAliveCount}`);
assert(Number(state.sim.unlockedZoneTier || 0) === 0, `unlockedZoneTier must start at 0: ${state.sim.unlockedZoneTier}`);
assert(String(state.sim.nextZoneUnlockKind || "") === "", `nextZoneUnlockKind must start empty: ${state.sim.nextZoneUnlockKind}`);
assert(Number(state.sim.nextZoneUnlockCostEnergy || 0) === 0, `nextZoneUnlockCostEnergy must start at 0: ${state.sim.nextZoneUnlockCostEnergy}`);
assert(Number(state.sim.zoneUnlockProgress || 0) === 0, `zoneUnlockProgress must start at 0: ${state.sim.zoneUnlockProgress}`);
assert(Number(state.sim.coreEnergyStableTicks || 0) === 0, `coreEnergyStableTicks must start at 0: ${state.sim.coreEnergyStableTicks}`);
assert(Number(state.sim.cpuBootstrapDone || 0) === 0, `cpuBootstrapDone must start at 0: ${state.sim.cpuBootstrapDone}`);
assert(Number(state.sim.meanWaterField || 0) > 0, `meanWaterField stayed empty: ${state.sim.meanWaterField}`);
assert(state.world.founderMask.every((v) => (v | 0) === 0), "founderMask must be empty on genesis bootstrap");
assert(state.world.coreZoneMask.length === state.world.alive.length, "coreZoneMask length mismatch");
assert(state.world.coreZoneMask.every((v) => (v | 0) === 0), "coreZoneMask must start empty");
assert(state.world.zoneRole.length === state.world.alive.length, "zoneRole length mismatch");
assert(state.world.zoneId.length === state.world.alive.length, "zoneId length mismatch");
assert(state.world.zoneRole.every((v) => (v | 0) === 0), "zoneRole must start empty");
assert(state.world.zoneId.every((v) => (v | 0) === 0), "zoneId must start empty");
assert(Object.keys(state.world.zoneMeta || {}).length === 0, "zoneMeta must start empty");
assert(Object.keys(state.sim.patternCatalog || {}).length === 0, "patternCatalog must start empty");
assert(Number(state.sim.patternBonuses?.energy || 0) === 0, "patternBonuses.energy must start empty");
assert(state.world.visibility.length === state.world.alive.length, "visibility length mismatch");
assert(state.world.explored.length === state.world.alive.length, "explored length mismatch");
const genesisTick = Number(state.sim.tick || 0);

store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
const afterToggleGenesis = store.getState();
assert(afterToggleGenesis.sim.running === false, "TOGGLE_RUNNING(true) must be no-op in genesis");

store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const afterStepGenesis = store.getState();
assert(Number(afterStepGenesis.sim.tick || 0) === genesisTick, "SIM_STEP must be no-op in genesis");

store.dispatch({
  type: "APPLY_BUFFERED_SIM_STEP",
  payload: { patches: [{ op: "set", path: "/sim/tick", value: genesisTick + 1 }] },
});
const afterBufferedGenesis = store.getState();
assert(Number(afterBufferedGenesis.sim.tick || 0) === genesisTick, "APPLY_BUFFERED_SIM_STEP must be no-op in genesis");

store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
const lab = store.getState();
const advisor = buildAdvisorModel(lab);
assert(lab.meta.gameMode === GAME_MODE.LAB_AUTORUN, `lab gameMode drift: ${lab.meta.gameMode}`);
assert(lab.sim.runPhase === RUN_PHASE.RUN_ACTIVE, `lab runPhase drift: ${lab.sim.runPhase}`);
assert(lab.sim.running === false, "lab bootstrap must not auto-run");
assert(Number(lab.sim.aliveCount || 0) > 0, `lab aliveCount stayed empty: ${lab.sim.aliveCount}`);
assert(Number(lab.sim.playerAliveCount || 0) > 0, `lab playerAliveCount stayed empty: ${lab.sim.playerAliveCount}`);
assert(Number(lab.sim.cpuAliveCount || 0) > 0, `lab cpuAliveCount stayed empty: ${lab.sim.cpuAliveCount}`);
assert(advisor.advisor.bottleneckPrimary !== "collapse", `lab bootstrap still reports collapse: ${advisor.advisor.bottleneckPrimary}`);

console.log("BOOTSTRAP_GEN_WORLD_OK genesis stays empty and lab retains legacy seed");

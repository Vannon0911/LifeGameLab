import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-network-decay-loss.mjs");

import { makeInitialState } from "../src/project/project.logic.js";
import { GAME_RESULT, RUN_PHASE, WIN_MODE, ZONE_ROLE } from "../src/game/contracts/ids.js";
import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = makeInitialState();
state.meta.playerLineageId = 1;
state.world = {
  w: 4,
  h: 4,
  alive: new Uint8Array(16),
  lineageId: new Uint32Array(16),
  zoneRole: new Int8Array(16),
  visibility: new Uint8Array(16),
};
state.world.visibility[0] = 1;
state.sim.unlockedZoneTier = 3;
state.sim.infrastructureUnlocked = true;
state.sim.winMode = WIN_MODE.SUPREMACY;

state.world.alive[1] = 1;
state.world.lineageId[1] = 1;
state.world.zoneRole[1] = ZONE_ROLE.CORE;

const simOut = {
  playerAliveCount: 1,
  playerEnergyNet: 1,
  playerEnergyIn: 4,
  cpuAliveCount: 1,
  cpuEnergyIn: 1,
};
applyWinConditions(state, simOut, 61);

assert(simOut.gameResult === GAME_RESULT.LOSS, "network decay must resolve to loss");
assert(simOut.winMode === WIN_MODE.NETWORK_DECAY, "network decay winMode drift");
assert(simOut.running === false, "network decay must stop the run");
assert(simOut.runPhase === RUN_PHASE.RESULT, "network decay must set result phase");

console.log("NETWORK_DECAY_LOSS_OK missing committed infra loss verified");

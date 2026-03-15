import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-vision-break-loss.mjs");

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
state.sim.unlockedZoneTier = 2;
state.sim.winMode = WIN_MODE.SUPREMACY;

state.world.alive[5] = 1;
state.world.lineageId[5] = 1;
state.world.zoneRole[5] = ZONE_ROLE.DNA;
state.world.alive[6] = 1;
state.world.lineageId[6] = 1;
state.world.zoneRole[6] = ZONE_ROLE.CORE;

const simOut = {
  playerAliveCount: 1,
  playerEnergyNet: 1,
  playerEnergyIn: 4,
  cpuAliveCount: 1,
  cpuEnergyIn: 1,
};
applyWinConditions(state, simOut, 51);

assert(simOut.gameResult === GAME_RESULT.LOSS, "vision break must resolve to loss");
assert(simOut.winMode === WIN_MODE.VISION_BREAK, "vision break winMode drift");
assert(simOut.running === false, "vision break must stop the run");
assert(simOut.runPhase === RUN_PHASE.RESULT, "vision break must set result phase");

console.log("VISION_BREAK_LOSS_OK zero visibility loss verified");

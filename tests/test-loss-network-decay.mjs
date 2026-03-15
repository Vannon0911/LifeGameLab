import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-loss-network-decay.mjs");

import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";
import { GAME_RESULT, RUN_PHASE, WIN_MODE, ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = {
  meta: { playerLineageId: 1 },
  world: {
    alive: new Uint8Array([1, 1, 0]),
    lineageId: new Uint32Array([1, 1, 1]),
    zoneRole: new Uint8Array([ZONE_ROLE.CORE, 0, ZONE_ROLE.INFRA]),
    visibility: new Uint8Array([1, 1, 1]),
  },
  sim: { unlockedZoneTier: 3, infrastructureUnlocked: true, gameResult: "" },
};
const simOut = {
  playerAliveCount: 1,
  cpuAliveCount: 0,
  playerEnergyIn: 2,
  playerEnergyNet: 1,
};
applyWinConditions(state, simOut, 61);
assert(simOut.gameResult === GAME_RESULT.LOSS, "network decay must resolve to loss");
assert(simOut.winMode === WIN_MODE.NETWORK_DECAY, `expected network decay, got ${simOut.winMode}`);
assert(simOut.runPhase === RUN_PHASE.RESULT, "network decay must enter result phase");

console.log("LOSS_NETWORK_DECAY_OK infrastructure loss path resolves");

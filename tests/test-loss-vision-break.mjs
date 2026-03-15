import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-loss-vision-break.mjs");

import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";
import { GAME_RESULT, RUN_PHASE, WIN_MODE, ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = {
  meta: { playerLineageId: 1 },
  world: {
    alive: new Uint8Array([1, 1, 1]),
    lineageId: new Uint32Array([1, 1, 1]),
    zoneRole: new Uint8Array([ZONE_ROLE.CORE, 0, 0]),
    visibility: new Uint8Array([0, 0, 0]),
  },
  sim: { unlockedZoneTier: 2, infrastructureUnlocked: false, gameResult: "" },
};
const simOut = {
  playerAliveCount: 2,
  cpuAliveCount: 0,
  playerEnergyIn: 2,
  playerEnergyNet: 1,
};
applyWinConditions(state, simOut, 51);
assert(simOut.gameResult === GAME_RESULT.LOSS, "vision break must resolve to loss");
assert(simOut.winMode === WIN_MODE.VISION_BREAK, `expected vision break, got ${simOut.winMode}`);
assert(simOut.runPhase === RUN_PHASE.RESULT, "vision break must enter result phase");

console.log("LOSS_VISION_BREAK_OK visibility loss path resolves");

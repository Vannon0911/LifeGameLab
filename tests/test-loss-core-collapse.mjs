import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-loss-core-collapse.mjs");

import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";
import { GAME_RESULT, RUN_PHASE, WIN_MODE, ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const state = {
  meta: { playerLineageId: 1 },
  world: {
    alive: new Uint8Array([1, 0]),
    lineageId: new Uint32Array([1, 1]),
    zoneRole: new Uint8Array([0, ZONE_ROLE.CORE]),
    visibility: new Uint8Array([1, 1]),
  },
  sim: { unlockedZoneTier: 1, infrastructureUnlocked: false, gameResult: "" },
};
const simOut = {
  playerAliveCount: 1,
  cpuAliveCount: 0,
  playerEnergyIn: 2,
  playerEnergyNet: 1,
};
applyWinConditions(state, simOut, 31);
assert(simOut.gameResult === GAME_RESULT.LOSS, "core collapse must resolve to loss");
assert(simOut.winMode === WIN_MODE.CORE_COLLAPSE, `expected core collapse, got ${simOut.winMode}`);
assert(simOut.runPhase === RUN_PHASE.RESULT, "core collapse must enter result phase");

console.log("LOSS_CORE_COLLAPSE_OK canonical core loss path resolves");

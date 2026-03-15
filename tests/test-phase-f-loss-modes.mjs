import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-phase-f-loss-modes.mjs");

import { makeInitialState } from "../src/project/project.logic.js";
import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";
import { GAME_RESULT, RUN_PHASE, WIN_MODE, ZONE_ROLE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createBaseState() {
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
  state.sim.winMode = WIN_MODE.SUPREMACY;
  return state;
}

function createBaseSimOut() {
  return {
    playerAliveCount: 1,
    playerEnergyNet: 1,
    playerEnergyIn: 4,
    cpuAliveCount: 1,
    cpuEnergyIn: 1,
  };
}

const cases = [
  {
    id: "core_collapse",
    expectedWinMode: WIN_MODE.CORE_COLLAPSE,
    tick: 31,
    setup(state, simOut) {
      state.sim.unlockedZoneTier = 1;
      state.world.zoneRole[5] = ZONE_ROLE.CORE;
      state.world.zoneRole[6] = ZONE_ROLE.CORE;
      simOut.playerAliveCount = 2;
    },
  },
  {
    id: "vision_break",
    expectedWinMode: WIN_MODE.VISION_BREAK,
    tick: 51,
    setup(state) {
      state.sim.unlockedZoneTier = 2;
      state.world.alive[5] = 1;
      state.world.lineageId[5] = 1;
      state.world.zoneRole[5] = ZONE_ROLE.DNA;
      state.world.alive[6] = 1;
      state.world.lineageId[6] = 1;
      state.world.zoneRole[6] = ZONE_ROLE.CORE;
    },
  },
  {
    id: "network_decay",
    expectedWinMode: WIN_MODE.NETWORK_DECAY,
    tick: 61,
    setup(state) {
      state.sim.unlockedZoneTier = 3;
      state.sim.infrastructureUnlocked = true;
      state.world.visibility[0] = 1;
      state.world.alive[1] = 1;
      state.world.lineageId[1] = 1;
      state.world.zoneRole[1] = ZONE_ROLE.CORE;
    },
  },
];

let pass = 0;
for (const testCase of cases) {
  try {
    const state = createBaseState();
    const simOut = createBaseSimOut();
    testCase.setup(state, simOut);
    applyWinConditions(state, simOut, testCase.tick);

    assert(simOut.gameResult === GAME_RESULT.LOSS, `${testCase.id} must resolve to loss`);
    assert(simOut.winMode === testCase.expectedWinMode, `${testCase.id} winMode drift`);
    assert(simOut.running === false, `${testCase.id} must stop the run`);
    assert(simOut.runPhase === RUN_PHASE.RESULT, `${testCase.id} must set result phase`);
    pass++;
    console.log(`  ${testCase.id}: deterministic result-only loss verified`);
  } catch (err) {
    console.error(`LOSS MODE FAIL ${testCase.id}:`, err.message);
  }
}

console.log(`PHASE_F_LOSS_MODES_OK ${pass}/${cases.length}`);
if (pass < cases.length) process.exit(1);

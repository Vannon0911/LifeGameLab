import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-result-phase.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { makeInitialState, reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE, GAME_RESULT, RUN_PHASE, WIN_MODE } from "../src/game/contracts/ids.js";
import { applyWinConditions } from "../src/game/sim/reducer/winConditions.js";
import { handlePlaceCell } from "../src/game/sim/playerActions.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Loss path must set runPhase=RESULT.
{
  const state = makeInitialState();
  state.sim.gameResult = GAME_RESULT.NONE;
  state.sim.winMode = WIN_MODE.SUPREMACY;
  const simOut = {
    playerAliveCount: 0,
    playerEnergyNet: 0,
    playerEnergyIn: 0,
    cpuAliveCount: 10,
    cpuEnergyIn: 10,
  };
  applyWinConditions({ sim: state.sim }, simOut, 30);
  assert(simOut.gameResult === GAME_RESULT.LOSS, "extinction must resolve to loss");
  assert(simOut.runPhase === RUN_PHASE.RESULT, "loss must set runPhase=RESULT");
}

// Win path must set runPhase=RESULT.
{
  const state = makeInitialState();
  state.sim.gameResult = GAME_RESULT.NONE;
  state.sim.winMode = WIN_MODE.SUPREMACY;
  state.sim.energySupremacyTicks = 199;
  const simOut = {
    playerAliveCount: 40,
    playerEnergyNet: 5,
    playerEnergyIn: 30,
    cpuAliveCount: 10,
    cpuEnergyIn: 10,
  };
  applyWinConditions({ sim: state.sim }, simOut, 200);
  assert(simOut.gameResult === GAME_RESULT.WIN, "supremacy threshold must resolve to win");
  assert(simOut.runPhase === RUN_PHASE.RESULT, "win must set runPhase=RESULT");
}

// RESULT must block placement and confirm.
{
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: "result-phase-gate-1" });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  const state = store.getState();
  const resultState = {
    ...state,
    sim: {
      ...state.sim,
      runPhase: RUN_PHASE.RESULT,
      gameResult: GAME_RESULT.LOSS,
    },
  };
  let emptyIdx = -1;
  for (let i = 0; i < resultState.world.alive.length; i++) {
    if (resultState.world.alive[i] !== 0) continue;
    emptyIdx = i;
    break;
  }
  assert(emptyIdx >= 0, "result placement test requires empty tile");
  const x = emptyIdx % resultState.world.w;
  const y = (emptyIdx / resultState.world.w) | 0;
  const placePatches = handlePlaceCell(resultState, { type: "PLACE_CELL", payload: { x, y, remove: false } });
  assert(Array.isArray(placePatches) && placePatches.length === 0, "PLACE_CELL must be blocked in RESULT");

  const confirmPatches = reducer(resultState, { type: "CONFIRM_FOUNDATION", payload: {} }, { rng: {} });
  assert(Array.isArray(confirmPatches) && confirmPatches.length === 0, "CONFIRM_FOUNDATION must be blocked in RESULT");
}

console.log("RESULT_PHASE_OK win/loss and result gates verified");

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

function makeCanonicalState({
  committedCore = true,
  visibleCore = true,
  aliveCore = true,
  committedDna = false,
  visibleDna = true,
  committedInfra = false,
  aliveInfra = true,
  infrastructureUnlocked = false,
  networkRatio = 0.20,
} = {}) {
  const size = 6;
  const alive = new Uint8Array(size);
  const lineageId = new Uint32Array(size);
  const visibility = new Uint8Array(size);
  const zoneRole = new Array(size).fill("");
  const zoneId = new Array(size).fill("");
  const zoneMeta = {
    core_a: { role: "core", committed: committedCore, playerLineageId: 1 },
    dna_a: { role: "dna", committed: committedDna, playerLineageId: 1 },
    infra_a: { role: "infra", committed: committedInfra, playerLineageId: 1 },
  };

  zoneRole[0] = "core";
  zoneId[0] = "core_a";
  visibility[0] = visibleCore ? 1 : 0;
  alive[0] = aliveCore ? 1 : 0;
  lineageId[0] = aliveCore ? 1 : 0;

  zoneRole[1] = "dna";
  zoneId[1] = "dna_a";
  visibility[1] = visibleDna ? 1 : 0;
  alive[1] = committedDna ? 1 : 0;
  lineageId[1] = committedDna ? 1 : 0;

  zoneRole[2] = "infra";
  zoneId[2] = "infra_a";
  visibility[2] = 1;
  alive[2] = aliveInfra ? 1 : 0;
  lineageId[2] = aliveInfra ? 1 : 0;

  return {
    meta: { playerLineageId: 1 },
    world: { alive, lineageId, visibility, zoneRole, zoneId, zoneMeta },
    sim: {
      gameResult: GAME_RESULT.NONE,
      winMode: WIN_MODE.SUPREMACY,
      infrastructureUnlocked,
      dnaZoneCommitted: committedDna,
      networkRatio,
      energySupremacyTicks: 0,
      stockpileTicks: 0,
      efficiencyTicks: 0,
      lossStreakTicks: 0,
      cpuEnergyIn: 0,
    },
  };
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

// Canonical core collapse must resolve to result-only loss code.
{
  const state = makeCanonicalState({
    committedCore: true,
    visibleCore: true,
    aliveCore: false,
  });
  const simOut = {
    playerAliveCount: 4,
    playerEnergyNet: 1,
    playerEnergyIn: 6,
    cpuAliveCount: 1,
    cpuEnergyIn: 1,
  };
  applyWinConditions(state, simOut, 45);
  assert(simOut.gameResult === GAME_RESULT.LOSS, "core collapse must resolve to loss");
  assert(simOut.winMode === WIN_MODE.CORE_COLLAPSE, `expected core_collapse, got ${simOut.winMode}`);
  assert(simOut.runPhase === RUN_PHASE.RESULT, "core collapse must set result phase");
}

// Canonical vision break must resolve to result-only loss code.
{
  const state = makeCanonicalState({
    committedCore: true,
    visibleCore: false,
    aliveCore: true,
    committedDna: true,
    visibleDna: false,
  });
  const simOut = {
    playerAliveCount: 4,
    playerEnergyNet: 1,
    playerEnergyIn: 6,
    cpuAliveCount: 1,
    cpuEnergyIn: 1,
  };
  applyWinConditions(state, simOut, 45);
  assert(simOut.gameResult === GAME_RESULT.LOSS, "vision break must resolve to loss");
  assert(simOut.winMode === WIN_MODE.VISION_BREAK, `expected vision_break, got ${simOut.winMode}`);
}

// Canonical network decay must resolve to result-only loss code.
{
  const state = makeCanonicalState({
    committedCore: true,
    visibleCore: true,
    aliveCore: true,
    committedInfra: true,
    aliveInfra: false,
    infrastructureUnlocked: true,
    networkRatio: 0.02,
  });
  const simOut = {
    playerAliveCount: 4,
    playerEnergyNet: 1,
    playerEnergyIn: 6,
    cpuAliveCount: 1,
    cpuEnergyIn: 1,
    networkRatio: 0.02,
  };
  applyWinConditions(state, simOut, 45);
  assert(simOut.gameResult === GAME_RESULT.LOSS, "network decay must resolve to loss");
  assert(simOut.winMode === WIN_MODE.NETWORK_DECAY, `expected network_decay, got ${simOut.winMode}`);
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

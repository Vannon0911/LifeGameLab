import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-release-candidate-integrity.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function makeStore(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  return store;
}

function summarizeBoot(state) {
  return {
    gameMode: state.meta.gameMode,
    runPhase: state.sim.runPhase,
    running: !!state.sim.running,
    tick: Number(state.sim.tick || 0),
    founderBudget: Number(state.sim.founderBudget || 0),
    founderPlaced: Number(state.sim.founderPlaced || 0),
    playerAliveCount: Number(state.sim.playerAliveCount || 0),
    cpuAliveCount: Number(state.sim.cpuAliveCount || 0),
    worldPresetId: String(state.meta.worldPresetId || ""),
  };
}

function placeFounderBlock(store) {
  const state = store.getState();
  const preset = getWorldPreset(state.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, state.world.w, state.world.h);
  const founders = [
    { x: range.x0, y: range.y0 },
    { x: range.x0 + 1, y: range.y0 },
    { x: range.x0, y: range.y0 + 1 },
    { x: range.x0 + 1, y: range.y0 + 1 },
  ];
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });
  for (const founder of founders) {
    store.dispatch({ type: "PLACE_CELL", payload: { ...founder, remove: false } });
  }
}

function runMainRunSequence(seed) {
  const store = makeStore(seed);
  store.dispatch({ type: "GEN_WORLD" });
  const boot = store.getState();
  assert(boot.meta.gameMode === GAME_MODE.GENESIS, `expected genesis boot, got ${boot.meta.gameMode}`);
  assert(boot.sim.runPhase === RUN_PHASE.GENESIS_SETUP, `expected GENESIS_SETUP, got ${boot.sim.runPhase}`);
  assert(boot.sim.running === false, "clean boot must start paused");

  placeFounderBlock(store);
  store.dispatch({ type: "CONFIRM_FOUNDATION" });
  const afterFoundation = store.getState();
  assert(afterFoundation.sim.runPhase === RUN_PHASE.GENESIS_ZONE, "foundation must move into GENESIS_ZONE");
  assert(afterFoundation.sim.running === false, "genesis zone must remain paused");

  store.dispatch({ type: "CONFIRM_CORE_ZONE" });
  const afterCore = store.getState();
  assert(afterCore.sim.runPhase === RUN_PHASE.RUN_ACTIVE, "core confirm must enter RUN_ACTIVE");
  assert(afterCore.sim.running === true, "core confirm must start the run");
  assert(Number(afterCore.sim.unlockedZoneTier || 0) === 1, "core confirm must unlock tier 1");
  assert(String(afterCore.sim.nextZoneUnlockKind || "") === "DNA", "next unlock kind must be DNA");
  assert(afterCore.world.coreZoneMask.some((value) => (Number(value) | 0) === 1), "core zone mask must be stamped");

  for (let i = 0; i < 6; i++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }

  const finalState = store.getState();
  return {
    signature: store.getSignature(),
    boot: summarizeBoot(boot),
    final: {
      runPhase: finalState.sim.runPhase,
      running: !!finalState.sim.running,
      tick: Number(finalState.sim.tick || 0),
      unlockedZoneTier: Number(finalState.sim.unlockedZoneTier || 0),
      nextZoneUnlockKind: String(finalState.sim.nextZoneUnlockKind || ""),
      playerAliveCount: Number(finalState.sim.playerAliveCount || 0),
      cpuAliveCount: Number(finalState.sim.cpuAliveCount || 0),
      zoneUnlockProgress: Number(finalState.sim.zoneUnlockProgress || 0),
    },
  };
}

function findEmptyTile(state) {
  for (let y = 1; y < state.world.h - 1; y++) {
    for (let x = 1; x < state.world.w - 1; x++) {
      const idx = y * state.world.w + x;
      if (state.world.alive[idx] === 0) return { idx, x, y };
    }
  }
  return null;
}

function runLabSequence(seed) {
  const store = makeStore(seed);
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  for (let i = 0; i < 4; i++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  }

  let state = store.getState();
  assert(state.meta.gameMode === GAME_MODE.LAB_AUTORUN, `expected lab autorun, got ${state.meta.gameMode}`);
  assert(Number(state.sim.tick || 0) >= 4, `lab run must advance ticks, got ${state.sim.tick}`);

  const cx = Math.floor(state.world.w / 2);
  const cy = Math.floor(state.world.h / 2);
  const centerIdx = cy * state.world.w + cx;
  store.dispatch({ type: "SET_ZONE", payload: { x: cx, y: cy, radius: 1, zoneType: 1 } });
  state = store.getState();
  assert(Number(state.world.zoneMap[centerIdx] || 0) === 1, "lab path must still allow SET_ZONE writes");

  const empty = findEmptyTile(state);
  assert(empty, "lab path requires an empty tile for PLACE_CELL");
  store.dispatch({ type: "SET_PLACEMENT_COST", payload: { enabled: false } });
  store.dispatch({ type: "PLACE_CELL", payload: { x: empty.x, y: empty.y, remove: false } });
  state = store.getState();
  assert(Number(state.world.alive[empty.idx] || 0) === 1, "lab path must still allow PLACE_CELL");

  return {
    signature: store.getSignature(),
    summary: {
      gameMode: state.meta.gameMode,
      tick: Number(state.sim.tick || 0),
      running: !!state.sim.running,
      zoneCenter: Number(state.world.zoneMap[centerIdx] || 0),
      placedAlive: Number(state.world.alive[empty.idx] || 0),
      playerAliveCount: Number(state.sim.playerAliveCount || 0),
      cpuAliveCount: Number(state.sim.cpuAliveCount || 0),
    },
  };
}

{
  const bootA = makeStore("rc-boot-seed");
  const bootB = makeStore("rc-boot-seed");
  bootA.dispatch({ type: "GEN_WORLD" });
  bootB.dispatch({ type: "GEN_WORLD" });
  const summaryA = summarizeBoot(bootA.getState());
  const summaryB = summarizeBoot(bootB.getState());
  assert(JSON.stringify(summaryA) === JSON.stringify(summaryB), "clean boot drift for identical genesis seed");
  assert(bootA.getSignature() === bootB.getSignature(), "clean boot signature drift for identical genesis seed");
}

{
  const runA = runMainRunSequence("rc-main-seed");
  const runB = runMainRunSequence("rc-main-seed");
  assert(JSON.stringify(runA.boot) === JSON.stringify(runB.boot), "main-run boot summary drift");
  assert(JSON.stringify(runA.final) === JSON.stringify(runB.final), "main-run final summary drift");
  assert(runA.signature === runB.signature, "main-run signature drift");
}

{
  const labA = runLabSequence("rc-lab-seed");
  const labB = runLabSequence("rc-lab-seed");
  assert(JSON.stringify(labA.summary) === JSON.stringify(labB.summary), "lab summary drift");
  assert(labA.signature === labB.signature, "lab signature drift");
}

console.log("RELEASE_CANDIDATE_INTEGRITY_OK reproducible clean boot, main-run flow, and lab path verified");

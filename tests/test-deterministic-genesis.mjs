import assert from "node:assert/strict";

import { createDeterministicStore, getPlayerStartWindowSquare, snapshotStore } from "./support/liveTestKit.mjs";
import { evaluateFoundationEligibility } from "../src/game/sim/foundationEligibility.js";
function assertFoundationBlockedUntilEligible(seed) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "founder_place" } });

  const beforeConfirm = snapshotStore(store);
  const eligibility = evaluateFoundationEligibility(beforeConfirm.state);
  assert.equal(eligibility.founderPlaced, 0, "setup sanity: founderPlaced must be 0 before founder placement");
  assert.equal(eligibility.founderMaskCount, 0, "setup sanity: founderMaskCount must be 0 before founder placement");
  assert.equal(eligibility.eligible, false, "foundation must stay blocked before founder placement");
  assert.equal(eligibility.reason, "counter_mismatch", "missing founder must fail with counter_mismatch reason");

  store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
  const afterConfirm = snapshotStore(store);
  assert.equal(afterConfirm.signature, beforeConfirm.signature, "CONFIRM_FOUNDATION must not mutate state when eligibility is false");
  assert.equal(afterConfirm.state.sim.runPhase, "genesis_setup", "runPhase must stay genesis_setup while foundation is invalid");
  assert.equal(afterConfirm.state.sim.running, false, "running must stay false while foundation is invalid");
}

function runScenario(seed) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const afterGenWorld = snapshotStore(store);
  assert.equal(
    Array.from(afterGenWorld.state.world.alive).some((v) => (Number(v) | 0) === 1),
    false,
    "GEN_WORLD must start with zero alive world cells",
  );
  assert.equal(afterGenWorld.state.sim.aliveCount, 0, "GEN_WORLD must set sim.aliveCount=0");
  assert.equal(afterGenWorld.state.sim.playerAliveCount, 0, "GEN_WORLD must set sim.playerAliveCount=0");
  assert.equal(afterGenWorld.state.sim.cpuAliveCount, 0, "GEN_WORLD must set sim.cpuAliveCount=0");

  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "founder_place" } });
  const founderTiles = getPlayerStartWindowSquare(store.getState(), 1);
  for (const tile of founderTiles) {
  store.dispatch({ type: "PLACE_WORKER", payload: { x: tile.x, y: tile.y, remove: false } });
  }
  const afterFounders = snapshotStore(store);
  const foundationEligibility = evaluateFoundationEligibility(afterFounders.state);
  assert.equal(foundationEligibility.eligible, true, "foundation must be eligible after valid founder placement");
  assert.equal(foundationEligibility.reason, "ok", "valid founder placement must report foundation reason=ok");

  store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
  const afterFoundation = snapshotStore(store);
  assert.equal(afterFoundation.state.sim.runPhase, "genesis_zone", "state must enter core step after valid foundation");
  assert.equal(afterFoundation.state.sim.running, false, "simulation must stay paused in genesis_zone before core confirmation");

  store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
  const afterCore = snapshotStore(store);
  store.dispatch({ type: "SIM_STEP", payload: {} });
  const step1 = snapshotStore(store);
  store.dispatch({ type: "SIM_STEP", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
  store.dispatch({ type: "SIM_STEP", payload: {} });
  const step4 = snapshotStore(store);
  assert.equal(afterCore.state.sim.runPhase, "run_active", "main run must be active after genesis confirmations");
  assert.equal(afterCore.state.sim.running, true, "main run must be running after core confirmation");
  assert.equal(afterFounders.state.sim.founderPlaced, 1, "exactly one founder must be committed");
  assert.equal(afterCore.state.sim.runPhase, "run_active", "core confirmation must transition state to run_active");
  assert.equal(afterCore.state.sim.running, true, "core confirmation must activate running=true");
  assert.equal(afterCore.state.sim.cpuBootstrapDone, 1, "core confirmation must set cpuBootstrapDone=1");
  assert.equal(afterCore.state.sim.playerAliveCount, 1, "core confirmation must keep playerAliveCount=1");
  assert(afterCore.state.sim.cpuAliveCount > 0, "core confirmation must spawn cpu bootstrap population");
  return {
    seed,
    founderTiles,
    anchors: {
      afterFounders,
      afterFoundation,
      afterCore,
      step1,
      step4,
    },
  };
}

function assertIssueMoveLive(seed) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  store.dispatch({ type: "SET_BRUSH", payload: { brushMode: "founder_place" } });
  const founderTile = getPlayerStartWindowSquare(store.getState(), 1)[0];
  store.dispatch({ type: "PLACE_WORKER", payload: { x: founderTile.x, y: founderTile.y, remove: false } });
  store.dispatch({ type: "CONFIRM_FOUNDATION", payload: {} });
  store.dispatch({ type: "CONFIRM_CORE_ZONE", payload: {} });
  store.dispatch({ type: "SET_PHYSICS", payload: { C_birth_base: 999 } });

  const state = store.getState();
  const w = Number(state.meta.gridW || 0) | 0;
  const h = Number(state.meta.gridH || 0) | 0;
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const neighborsOf = (x, y) => [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ].filter((c) => c.x >= 0 && c.y >= 0 && c.x < w && c.y < h);

  let spawn = null;
  for (let yy = 0; yy < h && !spawn; yy++) {
    for (let xx = 0; xx < w && !spawn; xx++) {
      const idx = yy * w + xx;
      if ((Number(state.world.alive?.[idx] || 0) | 0) !== 0) continue;
      const target = neighborsOf(xx, yy).find((c) => {
        const nIdx = c.y * w + c.x;
        return (Number(state.world.alive?.[nIdx] || 0) | 0) === 0;
      });
      if (target) spawn = { x: xx, y: yy, target };
    }
  }

  assert(spawn, "ISSUE_MOVE test must find a valid spawn slot");
  const spawnIdx = spawn.y * w + spawn.x;
  store.dispatch({ type: "PLACE_WORKER", payload: { x: spawn.x, y: spawn.y, remove: false } });
  const afterSpawn = store.getState();
  assert.equal((Number(afterSpawn.world.alive?.[spawnIdx] || 0) | 0), 1, "ISSUE_MOVE test must place a worker");
  assert.equal((Number(afterSpawn.world.lineageId?.[spawnIdx] || 0) | 0), playerLineageId, "ISSUE_MOVE test must place own worker");

  store.dispatch({ type: "SET_TILE", payload: { x: spawn.target.x, y: spawn.target.y, radius: 1, value: 1 } });
  store.dispatch({ type: "ISSUE_MOVE", payload: { entityId: `worker:${spawn.x}:${spawn.y}`, targetX: spawn.target.x, targetY: spawn.target.y } });

  const ordered = store.getState();
  assert.equal(String(ordered.sim.selectedEntity?.entityKind || ""), "worker", "ISSUE_MOVE must set selectedEntity");
  assert.equal(String(ordered.sim.selectedEntity?.entityId || ""), `worker:${spawn.x}:${spawn.y}`, "ISSUE_MOVE must set selectedEntity id");
  assert.equal(Number(ordered.sim.selectedUnit ?? -1) | 0, spawnIdx, "ISSUE_MOVE must seed selectedUnit");
  assert.equal(String(ordered.sim.lastCommand || ""), `ISSUE_MOVE:${spawn.x},${spawn.y}->${spawn.target.x},${spawn.target.y}`, "ISSUE_MOVE must write canonical lastCommand");

  for (let i = 0; i < 23; i++) store.dispatch({ type: "SIM_STEP", payload: {} });
  const p23 = Number(store.getState().sim.selectedUnit ?? -1) | 0;
  store.dispatch({ type: "SIM_STEP", payload: {} });
  const p24 = Number(store.getState().sim.selectedUnit ?? -1) | 0;

  assert.equal(p23, spawnIdx, "ISSUE_MOVE must not move before tick 24");
  assert.notEqual(p24, spawnIdx, "ISSUE_MOVE must move on tick 24");
}

function assertSameSeedReplay(left, right, label) {
  assert.deepEqual(left.founderTiles, right.founderTiles, `${label}: founder placement path must be deterministic`);
  for (const anchor of ["afterCore", "step1", "step4"]) {
    assert.equal(left.anchors[anchor].signature, right.anchors[anchor].signature, `${label}:${anchor} signature drifted`);
    assert.equal(left.anchors[anchor].signatureMaterialHash, right.anchors[anchor].signatureMaterialHash, `${label}:${anchor} signature material drifted`);
    assert.equal(left.anchors[anchor].readModelHash, right.anchors[anchor].readModelHash, `${label}:${anchor} read model drifted`);
  }
}

assertFoundationBlockedUntilEligible("p0-seed-foundation-block");
assertIssueMoveLive("p0-seed-issue-move");

const sameSeedLeft = runScenario("p0-seed-main");
const sameSeedRight = runScenario("p0-seed-main");
const crossSeed = runScenario("p0-seed-alt");

assertSameSeedReplay(sameSeedLeft, sameSeedRight, "same-seed");
assert.notEqual(sameSeedLeft.anchors.afterCore.signatureMaterialHash, crossSeed.anchors.afterCore.signatureMaterialHash, "cross-seed after-core signature material must diverge");
assert.notEqual(sameSeedLeft.anchors.afterCore.signature, crossSeed.anchors.afterCore.signature, "cross-seed after-core signature must diverge");
assert.notEqual(sameSeedLeft.anchors.step1.readModelHash, crossSeed.anchors.step1.readModelHash, "cross-seed step-1 read model must diverge");
assert.notEqual(sameSeedLeft.anchors.step4.signatureMaterialHash, crossSeed.anchors.step4.signatureMaterialHash, "cross-seed step-4 signature material must diverge");
assert.notEqual(sameSeedLeft.anchors.step4.readModelHash, crossSeed.anchors.step4.readModelHash, "cross-seed step-4 read model must diverge");
assert(sameSeedLeft.anchors.step4.state.sim.tick >= 4, "scenario must advance at least four ticks");

console.log(
  `DETERMINISM_OK seed=${sameSeedLeft.seed} after-core=${sameSeedLeft.anchors.afterCore.signature}:${sameSeedLeft.anchors.afterCore.signatureMaterialHash}:${sameSeedLeft.anchors.afterCore.readModelHash} step-1=${sameSeedLeft.anchors.step1.signature}:${sameSeedLeft.anchors.step1.signatureMaterialHash}:${sameSeedLeft.anchors.step1.readModelHash} step-4=${sameSeedLeft.anchors.step4.signature}:${sameSeedLeft.anchors.step4.signatureMaterialHash}:${sameSeedLeft.anchors.step4.readModelHash} cross-seed=${crossSeed.seed}:${crossSeed.anchors.step4.signatureMaterialHash}:${crossSeed.anchors.step4.readModelHash}`,
);

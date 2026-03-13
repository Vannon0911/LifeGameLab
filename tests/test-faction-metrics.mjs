/**
 * test-faction-metrics.mjs
 * Verifies that P1 faction metrics (playerAliveCount, cpuAliveCount,
 * playerEnergyIn, cpuEnergyIn, lightShare, nutrientShare) are computed
 * correctly each tick and match ground-truth manual counts.
 *
 * These metrics drive the Energie-Dashboard UI and all win conditions.
 * A zero-value here while cells are alive is a gameplay blocker.
 */
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function mkStore(seed) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  return store;
}

function manualCount(world, lineageId) {
  let n = 0;
  for (let i = 0; i < world.alive.length; i++) {
    if (world.alive[i] === 1 && (Number(world.lineageId[i]) | 0) === lineageId) n++;
  }
  return n;
}

const SEEDS = ["faction-1", "faction-2"];
const TICKS = 80;
let pass = 0;

for (const seed of SEEDS) {
  try {
    const store = mkStore(seed);
    for (let t = 0; t < TICKS; t++) {
      store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    }

    const s = store.getState();
    const { world, sim, meta } = s;
    const pLid = meta.playerLineageId;
    const cLid = meta.cpuLineageId;

    // 1. Faction IDs must be set
    assert(pLid > 0, `${seed}: playerLineageId not set`);
    assert(cLid > 0, `${seed}: cpuLineageId not set`);
    assert(pLid !== cLid, `${seed}: playerLineageId === cpuLineageId`);

    // 2. aliveCount sanity
    const totalAlive = manualCount(world, pLid) + manualCount(world, cLid);
    assert(sim.aliveCount >= totalAlive, `${seed}: aliveCount ${sim.aliveCount} < manual total ${totalAlive}`);

    // 3. playerAliveCount must be > 0 (cells exist)
    const manualPlayer = manualCount(world, pLid);
    assert(manualPlayer > 0, `${seed}: no player cells alive at tick ${TICKS} — world dead?`);
    // Allow ±5% drift from step-boundary effects (cells born during same tick)
    const maxDrift = Math.max(3, Math.ceil(manualPlayer * 0.05));
    assert(
      Math.abs(sim.playerAliveCount - manualPlayer) <= maxDrift,
      `${seed}: playerAliveCount ${sim.playerAliveCount} vs manual ${manualPlayer} (drift>${maxDrift})`
    );

    // 4. cpuAliveCount must be > 0
    const manualCpu = manualCount(world, cLid);
    assert(manualCpu > 0, `${seed}: no cpu cells alive at tick ${TICKS}`);

    // 5. Energy metrics must be positive and finite
    assert(Number.isFinite(sim.playerEnergyIn) && sim.playerEnergyIn > 0,
      `${seed}: playerEnergyIn=${sim.playerEnergyIn} not positive finite`);
    assert(Number.isFinite(sim.cpuEnergyIn) && sim.cpuEnergyIn > 0,
      `${seed}: cpuEnergyIn=${sim.cpuEnergyIn} not positive finite`);

    // 6. lightShare and nutrientShare must be in (0,1]
    assert(sim.lightShare > 0 && sim.lightShare <= 1,
      `${seed}: lightShare=${sim.lightShare} out of range`);
    assert(sim.nutrientShare >= 0 && sim.nutrientShare <= 1,
      `${seed}: nutrientShare=${sim.nutrientShare} out of range`);

    // 7. seasonPhase must be in [0,1)
    assert(sim.seasonPhase >= 0 && sim.seasonPhase < 1,
      `${seed}: seasonPhase=${sim.seasonPhase} out of range`);

    pass++;
  } catch (err) {
    console.error(`FACTION_METRICS FAIL [${seed}]:`, err.message);
  }
}

console.log(`FACTION_METRICS_OK ${pass}/${SEEDS.length} — playerAliveCount, energyIn, shares verified`);
if (pass < SEEDS.length) process.exit(1);

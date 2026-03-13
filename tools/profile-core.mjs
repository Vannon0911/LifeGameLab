import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function fmtMB(n) { return `${(n / (1024 * 1024)).toFixed(1)}MB`; }

function runProfile({ seed, w, h, ticks }) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "SET_SIZE", payload: { w, h } });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  // Warm-up (JIT)
  for (let i = 0; i < 5; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });

  const mem0 = process.memoryUsage();
  const t0 = performance.now();
  for (let i = 0; i < ticks; i++) store.dispatch({ type: "SIM_STEP", payload: { force: true } });
  const t1 = performance.now();
  const mem1 = process.memoryUsage();
  const dt = t1 - t0;

  return {
    w,
    h,
    tiles: w * h,
    ticks,
    ms_total: Number(dt.toFixed(1)),
    ms_per_tick: Number((dt / ticks).toFixed(3)),
    heapUsed_delta: fmtMB(mem1.heapUsed - mem0.heapUsed),
    rss_delta: fmtMB(mem1.rss - mem0.rss),
  };
}

const cases = [
  { seed: "prof-32", w: 32, h: 32, ticks: 200 },
  { seed: "prof-64", w: 64, h: 64, ticks: 120 },
  { seed: "prof-96", w: 96, h: 96, ticks: 80 },
];

const out = cases.map(runProfile);
console.log(JSON.stringify(out, null, 2));

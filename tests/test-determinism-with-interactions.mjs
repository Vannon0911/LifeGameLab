import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-determinism-with-interactions.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import { createSignatureSnapshot, explainHashMismatch, sha256Hex } from "./support/determinismDiff.mjs";
import { closeDanglingHandles } from "./support/handleCleanup.mjs";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function buildScenario(seed) {
  // Deterministic scenario: same actions at the same ticks.
  // Note: we avoid time-based actions; everything is pure dispatch.
  return {
    seed,
    grid: { w: 32, h: 32 },
    steps: [
      // boot
      { type: "SET_SEED", payload: seed },
      { type: "SET_SIZE", payload: { w: 32, h: 32 } },
      { type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } },
      { type: "TOGGLE_RUNNING", payload: { running: true } },

      // some pure sim ticks
      ...Array.from({ length: 10 }, () => ({ type: "SIM_STEP", payload: { force: true } })),

      // user interactions (paint + place + physics + learning + ui flags)
      { type: "SET_BRUSH", payload: { brushMode: "toxin", brushRadius: 4 } },
      { type: "PAINT_BRUSH", payload: { x: 10, y: 10, radius: 4, mode: "toxin" } },
      { type: "PLACE_CELL", payload: { x: 6, y: 6, remove: false } },
      { type: "SET_PHYSICS", payload: { L_diffusion: 0.01 } },
      { type: "SET_GLOBAL_LEARNING", payload: { strength: 0.8 } },
      { type: "SET_UI", payload: { showBiochargeOverlay: true, expertMode: true } },

      // more sim ticks
      ...Array.from({ length: 40 }, () => ({ type: "SIM_STEP", payload: { force: true } })),

      // more interactions later
      { type: "PAINT_BRUSH", payload: { x: 12, y: 14, radius: 3, mode: "light_remove" } },
      { type: "PLACE_CELL", payload: { x: 6, y: 6, remove: true } },
      { type: "RESET_GLOBAL_LEARNING", payload: {} },

      ...Array.from({ length: 50 }, () => ({ type: "SIM_STEP", payload: { force: true } })),
    ],
  };
}

function buildScenarioVariant(seed) {
  const scn = buildScenario(seed);
  const steps = scn.steps.slice();
  const ix = steps.findIndex((step) => step.type === "SET_GLOBAL_LEARNING");
  if (ix >= 0) {
    steps[ix] = { type: "SET_GLOBAL_LEARNING", payload: { strength: 0.65 } };
  }
  return { ...scn, steps };
}

function runScenario(scn) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  const hashes = [];
  const sig0 = store.getSignatureMaterial();
  hashes.push({ i: 0, action: "INIT", ...createSignatureSnapshot(sig0) });
  let i = 0;
  for (const a of scn.steps) {
    i++;
    store.dispatch(a);
    hashes.push({ i, action: a.type, ...createSignatureSnapshot(store.getSignatureMaterial()) });
  }
  const traceDigest = sha256Hex(hashes.map((x) => x.sha256).join("\n"));
  return { hashes, traceDigest };
}

try {
  const seeds = ["uxdet-1", "uxdet-2"];
  for (const seed of seeds) {
    const scn = buildScenario(seed);
    const a = runScenario(scn);
    const b = runScenario(scn);

    const n = Math.min(a.hashes.length, b.hashes.length);
    for (let k = 0; k < n; k++) {
      if (a.hashes[k].sha256 !== b.hashes[k].sha256) {
        const ha = a.hashes[k];
        const hb = b.hashes[k];
        for (const line of explainHashMismatch({
          suite: "determinism-interactions",
          seed,
          pointLabel: `step ${k}`,
          action: ha.action,
          left: ha,
          right: hb,
        })) console.error(line);
        throw new Error(`[determinism-interactions] seed=${seed} mismatch at step=${k}`);
      }
    }

    assert(a.hashes.length === b.hashes.length, `[determinism-interactions] ${seed}: different trace lengths`);
    assert(a.traceDigest === b.traceDigest, `[determinism-interactions] ${seed}: digest drift`);
    console.log(`[determinism-interactions] ${seed}: OK steps=${a.hashes.length - 1} traceDigest=${a.traceDigest}`);
  }

  const baseScenario = buildScenario(seeds[0]);
  const variantScenario = buildScenarioVariant(seeds[0]);
  const base = runScenario(baseScenario);
  const variant = runScenario(variantScenario);
  assert(base.traceDigest !== variant.traceDigest, "variant interaction scenario should produce different digest");

  console.log(`Determinism with interactions results: ${seeds.length}/${seeds.length} + negative scenario divergence OK`);
} finally {
  await closeDanglingHandles();
}

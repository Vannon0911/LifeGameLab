import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import crypto from "node:crypto";

const SEEDS = ["det-1", "det-2", "det-3"];
const CHECKPOINTS = [100, 200, 300];

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function run(seed, ticks) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const sigAt = new Map();
  for (let t = 1; t <= ticks; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    if (CHECKPOINTS.includes(t)) sigAt.set(t, sha256Hex(store.getSignatureMaterial()));
  }
  return { finalSig: sha256Hex(store.getSignatureMaterial()), sigAt };
}

let pass = 0;
for (const seed of SEEDS) {
  const a = run(seed, Math.max(...CHECKPOINTS));
  const b = run(seed, Math.max(...CHECKPOINTS));

  let ok = true;
  for (const c of CHECKPOINTS) {
    if (a.sigAt.get(c) !== b.sigAt.get(c)) {
      console.error(`[determinism] ${seed}: FAIL at tick ${c}`);
      ok = false;
      break;
    }
  }
  if (ok && a.finalSig === b.finalSig) {
    console.log(`[determinism] ${seed}: OK (100/200/300)`);
    pass++;
  } else if (ok) {
    console.error(`[determinism] ${seed}: FAIL at final signature`);
  }
}

console.log(`Determinism long results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

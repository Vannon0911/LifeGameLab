import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import crypto from "node:crypto";

const SEEDS = ["det-1", "det-2", "det-3"];
const TICKS = 300;

function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function runTrace(seed, ticks) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const hashes = [];
  // tick 0 signature (post bootstrap, pre first step)
  hashes.push(sha256Hex(store.getSignatureMaterial()));
  for (let t = 1; t <= ticks; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    hashes.push(sha256Hex(store.getSignatureMaterial()));
  }
  // digest of the whole per-tick sequence (useful as a compact proof artifact)
  const traceDigest = sha256Hex(hashes.join("\n"));
  return { hashes, traceDigest };
}

let pass = 0;
for (const seed of SEEDS) {
  const a = runTrace(seed, TICKS);
  const b = runTrace(seed, TICKS);

  let ok = true;
  for (let t = 0; t <= TICKS; t++) {
    if (a.hashes[t] !== b.hashes[t]) {
      console.error(`[determinism-per-tick] ${seed}: FAIL at tick ${t}`);
      console.error(`a=${a.hashes[t]}`);
      console.error(`b=${b.hashes[t]}`);
      ok = false;
      break;
    }
  }

  if (ok) {
    console.log(`[determinism-per-tick] ${seed}: OK (0..${TICKS}) traceDigest=${a.traceDigest}`);
    pass++;
  }
}

console.log(`Determinism per-tick results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

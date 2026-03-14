import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { createSignatureSnapshot, explainHashMismatch, sha256Hex } from "./support/determinismDiff.mjs";

const SEEDS = ["det-1", "det-2", "det-3"];
const CHECKPOINTS = [100, 200, 300];

function run(seed, ticks) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD" });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const sigAt = new Map();
  for (let t = 1; t <= ticks; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    if (CHECKPOINTS.includes(t)) sigAt.set(t, createSignatureSnapshot(store.getSignatureMaterial()));
  }
  return { finalSig: createSignatureSnapshot(store.getSignatureMaterial()), sigAt };
}

let pass = 0;
for (const seed of SEEDS) {
  const a = run(seed, Math.max(...CHECKPOINTS));
  const b = run(seed, Math.max(...CHECKPOINTS));

  let ok = true;
  for (const c of CHECKPOINTS) {
    const left = a.sigAt.get(c);
    const right = b.sigAt.get(c);
    if (left.sha256 !== right.sha256) {
      for (const line of explainHashMismatch({
        suite: "determinism",
        seed,
        pointLabel: `tick ${c}`,
        left,
        right,
      })) console.error(line);
      ok = false;
      break;
    }
  }
  if (ok && a.finalSig.sha256 === b.finalSig.sha256) {
    console.log(`[determinism] ${seed}: OK (100/200/300) finalTrace=${sha256Hex(CHECKPOINTS.map((c) => a.sigAt.get(c).sha256).join("\n"))}`);
    pass++;
  } else if (ok) {
    for (const line of explainHashMismatch({
      suite: "determinism",
      seed,
      pointLabel: "final signature",
      left: a.finalSig,
      right: b.finalSig,
    })) console.error(line);
  }
}

console.log(`Determinism long results: ${pass}/${SEEDS.length}`);
if (pass < SEEDS.length) process.exit(1);

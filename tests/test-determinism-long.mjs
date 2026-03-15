import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-determinism-long.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import { createSignatureSnapshot, explainHashMismatch, sha256Hex } from "./support/determinismDiff.mjs";
import { closeDanglingHandles } from "./support/handleCleanup.mjs";

const SEEDS = ["det-1", "det-2", "det-3"];
const CHECKPOINTS = [100, 200, 300];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function run(seed, ticks) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  store.dispatch({ type: "SET_SEED", payload: seed });
  store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

  const sigAt = new Map();
  for (let t = 1; t <= ticks; t++) {
    store.dispatch({ type: "SIM_STEP", payload: { force: true } });
    if (CHECKPOINTS.includes(t)) sigAt.set(t, createSignatureSnapshot(store.getSignatureMaterial()));
  }
  return { finalSig: createSignatureSnapshot(store.getSignatureMaterial()), sigAt };
}

try {
  for (const seed of SEEDS) {
    const a = run(seed, Math.max(...CHECKPOINTS));
    const b = run(seed, Math.max(...CHECKPOINTS));

    for (const c of CHECKPOINTS) {
      const left = a.sigAt.get(c);
      const right = b.sigAt.get(c);
      assert(left && right, `[determinism] missing checkpoint signature at tick ${c}`);
      if (left.sha256 !== right.sha256) {
        for (const line of explainHashMismatch({
          suite: "determinism",
          seed,
          pointLabel: `tick ${c}`,
          left,
          right,
        })) console.error(line);
        throw new Error(`[determinism] seed=${seed} mismatch at checkpoint tick=${c}`);
      }
    }
    if (a.finalSig.sha256 !== b.finalSig.sha256) {
      for (const line of explainHashMismatch({
        suite: "determinism",
        seed,
        pointLabel: "final signature",
        left: a.finalSig,
        right: b.finalSig,
      })) console.error(line);
      throw new Error(`[determinism] seed=${seed} final signature drift`);
    }

    console.log(`[determinism] ${seed}: OK (100/200/300) finalTrace=${sha256Hex(CHECKPOINTS.map((c) => a.sigAt.get(c).sha256).join("\n"))}`);
  }

  const base = run(SEEDS[0], Math.max(...CHECKPOINTS));
  const altered = run(SEEDS[1], Math.max(...CHECKPOINTS));
  assert(base.finalSig.sha256 !== altered.finalSig.sha256, "different seeds should not converge to identical final signatures");

  console.log(`Determinism long results: ${SEEDS.length}/${SEEDS.length} + negative seed divergence OK`);
} finally {
  await closeDanglingHandles();
}

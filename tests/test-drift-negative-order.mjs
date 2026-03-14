import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-drift-negative-order.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import { createSignatureSnapshot, sha256Hex } from "./support/determinismDiff.mjs";
import { closeDanglingHandles } from "./support/handleCleanup.mjs";

function runActions(actions) {
  const store = createStore(manifest, { reducer, simStep: simStepPatch });
  const hashes = [];
  for (const action of actions) {
    store.dispatch(action);
    hashes.push(createSignatureSnapshot(store.getSignatureMaterial()).sha256);
  }
  return sha256Hex(hashes.join("\n"));
}

const baseBoot = [
  { type: "SET_SEED", payload: "drift-order-1" },
  { type: "SET_SIZE", payload: { w: 32, h: 32 } },
  { type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } },
  { type: "TOGGLE_RUNNING", payload: { running: true } },
];

const sequenceA = [
  ...baseBoot,
  { type: "SET_BRUSH", payload: { brushMode: "toxin", brushRadius: 4 } },
  { type: "PAINT_BRUSH", payload: { x: 10, y: 10, radius: 4, mode: "toxin" } },
  ...Array.from({ length: 20 }, () => ({ type: "SIM_STEP", payload: { force: true } })),
];

const sequenceB = [
  ...baseBoot,
  ...Array.from({ length: 20 }, () => ({ type: "SIM_STEP", payload: { force: true } })),
  { type: "SET_BRUSH", payload: { brushMode: "toxin", brushRadius: 4 } },
  { type: "PAINT_BRUSH", payload: { x: 10, y: 10, radius: 4, mode: "toxin" } },
];

try {
  const a = runActions(sequenceA);
  const b = runActions(sequenceB);
  if (a === b) {
    console.error("[drift-negative] FAIL: different action order produced identical trace digest");
    process.exit(1);
  }
  console.log(`[drift-negative] OK sequenceA=${a} sequenceB=${b}`);
} finally {
  await closeDanglingHandles();
}

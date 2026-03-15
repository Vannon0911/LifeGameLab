import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-network-commit-threshold.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";
import { COMMITTED_INFRA_THRESHOLD } from "../src/game/sim/infra.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "inv-2" });
store.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

for (let t = 0; t < 20; t++) {
  store.dispatch({ type: "SIM_STEP", payload: { force: true } });
}

const state = store.getState();
const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
const { alive, link, lineageId } = state.world;

for (let i = 0; i < alive.length; i++) {
  const lid = Number(lineageId[i] || 0) | 0;
  const linkValue = Number(link[i] || 0);
  if (lid !== playerLineageId) {
    assert(
      linkValue < COMMITTED_INFRA_THRESHOLD,
      `non-player tile ${i} reached committed infra threshold: lid=${lid} link=${linkValue}`,
    );
  }
  if (alive[i] !== 1) {
    assert(linkValue < 1e-6, `dead tile ${i} retained link=${linkValue}`);
  }
}

console.log("NETWORK_COMMIT_THRESHOLD_OK non-player dynamic links stay below committed infra and dead tiles clear links");

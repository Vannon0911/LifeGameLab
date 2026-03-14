import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-genesis-action-gates.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { GAME_MODE } from "../src/game/contracts/ids.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const blockedInGenesis = [
  { type: "PLACE_SPLIT_CLUSTER", payload: { x: 4, y: 4 } },
  { type: "SET_ZONE", payload: { x: 4, y: 4, radius: 2, zoneType: 1 } },
  { type: "HARVEST_CELL", payload: { x: 4, y: 4 } },
  { type: "BUY_EVOLUTION", payload: { archetypeId: "light_harvest" } },
  { type: "HARVEST_PULSE" },
  { type: "PRUNE_CLUSTER" },
  { type: "RECYCLE_PATCH" },
  { type: "SEED_SPREAD" },
];

const genesisStore = createStore(manifest, { reducer, simStep: simStepPatch });
genesisStore.dispatch({ type: "SET_SEED", payload: "genesis-gates-1" });
genesisStore.dispatch({ type: "GEN_WORLD" });
for (const action of blockedInGenesis) {
  const sigBefore = genesisStore.getSignature();
  genesisStore.dispatch(action);
  const sigAfter = genesisStore.getSignature();
  assert(sigAfter === sigBefore, `${action.type} must be blocked in genesis setup`);
}

const labStore = createStore(manifest, { reducer, simStep: simStepPatch });
labStore.dispatch({ type: "SET_SEED", payload: "genesis-gates-lab-1" });
labStore.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
const labSigBefore = labStore.getSignature();
labStore.dispatch({ type: "SET_ZONE", payload: { x: 4, y: 4, radius: 2, zoneType: 1 } });
const labSigAfter = labStore.getSignature();
assert(labSigAfter !== labSigBefore, "SET_ZONE must remain available in LAB_AUTORUN");

console.log("GENESIS_ACTION_GATES_OK blocked actions in genesis and lab path preserved");

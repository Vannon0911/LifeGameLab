import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-founder-placement.mjs");

import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";
import { BRUSH_MODE, GAME_MODE, RUN_PHASE } from "../src/game/contracts/ids.js";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";
import { handlePlaceCell } from "../src/game/sim/playerActions.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "founder-placement-1" });
store.dispatch({ type: "GEN_WORLD" });
store.dispatch({ type: "SET_BRUSH", payload: { brushMode: BRUSH_MODE.FOUNDER_PLACE } });

let s = store.getState();
assert(s.meta.gameMode === GAME_MODE.GENESIS, "expected genesis mode");
assert(s.sim.runPhase === RUN_PHASE.GENESIS_SETUP, "expected genesis setup");
assert(Number(s.sim.founderPlaced || 0) === 0, "founderPlaced must start at 0");
const dnaBefore = Number(s.sim.playerDNA || 0);

const preset = getWorldPreset(s.meta.worldPresetId);
const range = getStartWindowRange(preset.startWindows.player, s.world.w, s.world.h);
const legal = [];
for (let y = range.y0; y < range.y1; y++) {
  for (let x = range.x0; x < range.x1; x++) {
    legal.push({ x, y, idx: y * s.world.w + x });
    if (legal.length >= 5) break;
  }
  if (legal.length >= 5) break;
}
assert(legal.length >= 5, "not enough legal founder tiles in start window");

const illegal = { x: Math.max(0, range.x0 - 1), y: range.y0 };
store.dispatch({ type: "PLACE_CELL", payload: { x: illegal.x, y: illegal.y, remove: false } });
s = store.getState();
assert(Number(s.sim.founderPlaced || 0) === 0, "illegal founder placement must not change founderPlaced");

for (let i = 0; i < 4; i++) {
  const p = legal[i];
  store.dispatch({ type: "PLACE_CELL", payload: { x: p.x, y: p.y, remove: false } });
  s = store.getState();
  assert(Number(s.sim.founderPlaced || 0) === i + 1, `founderPlaced drift at ${i + 1}`);
  assert((s.world.alive[p.idx] | 0) === 1, "founder tile must be alive");
  assert((s.world.founderMask[p.idx] | 0) === 1, "founderMask must be set");
  assert((Number(s.world.lineageId[p.idx]) | 0) === (Number(s.meta.playerLineageId || 1) | 0), "founder owner must be player");
}

const fifth = legal[4];
store.dispatch({ type: "PLACE_CELL", payload: { x: fifth.x, y: fifth.y, remove: false } });
s = store.getState();
assert(Number(s.sim.founderPlaced || 0) === 4, "fifth founder must be blocked");
assert((s.world.founderMask[fifth.idx] | 0) === 0, "fifth founder tile must stay non-founder");

const first = legal[0];
store.dispatch({ type: "PLACE_CELL", payload: { x: first.x, y: first.y, remove: true } });
s = store.getState();
assert(Number(s.sim.founderPlaced || 0) === 3, "founder removal must decrement founderPlaced");
assert((s.world.alive[first.idx] | 0) === 0, "removed founder tile must be dead");
assert((s.world.founderMask[first.idx] | 0) === 0, "removed founder tile must clear founderMask");

store.dispatch({ type: "PLACE_CELL", payload: { x: first.x, y: first.y, remove: false } });
s = store.getState();
assert(Number(s.sim.founderPlaced || 0) === 4, "re-placing founder must restore founderPlaced");
assert(Number(s.sim.playerDNA || 0) === dnaBefore, "genesis founder placement must not consume DNA");

const runActiveState = {
  ...s,
  sim: {
    ...s.sim,
    runPhase: RUN_PHASE.RUN_ACTIVE,
  },
};
const blocked = handlePlaceCell(runActiveState, {
  type: "PLACE_CELL",
  payload: { x: first.x, y: first.y, remove: false },
});
assert(Array.isArray(blocked) && blocked.length === 0, "PLACE_CELL must be blocked in genesis mode after RUN_ACTIVE");

const labStore = createStore(manifest, { reducer, simStep: simStepPatch });
labStore.dispatch({ type: "SET_SEED", payload: "founder-placement-lab-1" });
labStore.dispatch({ type: "GEN_WORLD", payload: { gameMode: GAME_MODE.LAB_AUTORUN } });
labStore.dispatch({ type: "SET_PLACEMENT_COST", payload: { enabled: false } });
let lab = labStore.getState();
let labIdx = -1;
for (let i = 0; i < lab.world.alive.length; i++) {
  if (lab.world.alive[i] !== 0) continue;
  labIdx = i;
  break;
}
assert(labIdx >= 0, "lab test requires at least one empty tile");
const lx = labIdx % lab.world.w;
const ly = (labIdx / lab.world.w) | 0;
labStore.dispatch({ type: "PLACE_CELL", payload: { x: lx, y: ly, remove: false } });
lab = labStore.getState();
assert((lab.world.alive[labIdx] | 0) === 1, "lab PLACE_CELL must retain legacy placement");

console.log("FOUNDER_PLACEMENT_OK genesis founder gates and lab legacy path verified");

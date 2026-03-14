import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-player-action-ownership.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "ownership-1" });
store.dispatch({ type: "GEN_WORLD" });

let s = store.getState();
const playerLid = s.meta.playerLineageId;
const cpuLid = s.meta.cpuLineageId;

// Find an isolated empty tile if possible, otherwise any empty tile.
let empty = -1;
for (let i = 0; i < s.world.alive.length; i++) {
  if (s.world.alive[i] !== 0) continue;
  empty = i;
  break;
}
assert(empty >= 0, "No empty tile found");
const ex = empty % s.world.w;
const ey = Math.floor(empty / s.world.w);
store.dispatch({ type: "PLACE_CELL", payload: { x: ex, y: ey, remove: false } });
s = store.getState();
assert(s.world.alive[empty] === 1, "PLACE_CELL did not create a cell on empty tile");
assert((Number(s.world.lineageId[empty]) | 0) === playerLid, `Isolated placement owner mismatch: ${s.world.lineageId[empty]} vs ${playerLid}`);

// Find a CPU cell and verify player actions cannot overwrite or remove it.
let cpuIdx = -1;
for (let i = 0; i < s.world.alive.length; i++) {
  if (s.world.alive[i] === 1 && (Number(s.world.lineageId[i]) | 0) === cpuLid) {
    cpuIdx = i;
    break;
  }
}
assert(cpuIdx >= 0, "No CPU cell found");
const cx = cpuIdx % s.world.w;
const cy = Math.floor(cpuIdx / s.world.w);
const cpuHue = Number(s.world.hue[cpuIdx] || 0);

store.dispatch({ type: "PLACE_CELL", payload: { x: cx, y: cy, remove: false } });
s = store.getState();
assert(s.world.alive[cpuIdx] === 1, "CPU cell got overwritten by PLACE_CELL");
assert((Number(s.world.lineageId[cpuIdx]) | 0) === cpuLid, "CPU ownership changed after PLACE_CELL overwrite attempt");
assert(Number(s.world.hue[cpuIdx] || 0) === cpuHue, "CPU cell hue changed on overwrite attempt");

store.dispatch({ type: "PLACE_CELL", payload: { x: cx, y: cy, remove: true } });
s = store.getState();
assert(s.world.alive[cpuIdx] === 1, "CPU cell got removed by player delete action");
assert((Number(s.world.lineageId[cpuIdx]) | 0) === cpuLid, "CPU ownership changed after delete attempt");

// Removing own cell must still work.
store.dispatch({ type: "PLACE_CELL", payload: { x: ex, y: ey, remove: true } });
s = store.getState();
assert(s.world.alive[empty] === 0, "Player cell remove did not work");
assert((Number(s.world.lineageId[empty]) | 0) === 0, "Removed player cell kept ownership metadata");

console.log("PLAYER_ACTION_OWNERSHIP_OK placement/removal respects player ownership");

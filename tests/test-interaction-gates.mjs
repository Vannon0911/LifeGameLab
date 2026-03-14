import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-interaction-gates.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";
import { reducer, simStepPatch } from "../src/project/project.logic.js";

function hashBytesFNV1a(u8) {
  let h = 2166136261;
  for (let i = 0; i < u8.length; i++) {
    h ^= u8[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hashTypedArraySampled(ta) {
  const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  const seg = 1024;
  if (u8.length <= seg * 3) return hashBytesFNV1a(u8);
  const head = u8.subarray(0, seg);
  const midStart = Math.max(0, ((u8.length / 2) | 0) - (seg >> 1));
  const mid = u8.subarray(midStart, midStart + seg);
  const tail = u8.subarray(u8.length - seg);
  const a = hashBytesFNV1a(head);
  const b = hashBytesFNV1a(mid);
  const c = hashBytesFNV1a(tail);
  return (a ^ ((b << 1) | (b >>> 31)) ^ ((c << 7) | (c >>> 25))) >>> 0;
}

function snap(world, keys) {
  const out = {};
  for (const k of keys) {
    const v = world[k];
    if (!v || !ArrayBuffer.isView(v)) throw new Error(`expected TypedArray at world.${k}`);
    out[k] = { ref: v, hash: hashTypedArraySampled(v) };
  }
  return out;
}

function assertUnchanged(prev, label) {
  for (const k of Object.keys(prev)) {
    const { ref, hash } = prev[k];
    const h2 = hashTypedArraySampled(ref);
    if (h2 !== hash) throw new Error(`${label}: old world.${k} mutated in-place`);
  }
}

function assertReplaced(prev, nextWorld, keys, label) {
  for (const k of keys) {
    if (nextWorld[k] === prev[k].ref) throw new Error(`${label}: world.${k} reference not replaced`);
  }
}

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: "interaction-gates-1" });
store.dispatch({ type: "GEN_WORLD" });

const keys = ["L", "R", "W", "Sat", "alive", "E", "reserve", "link", "lineageId", "trait", "hue", "born", "died", "age"];

// PAINT_BRUSH must not mutate previous arrays.
let s0 = store.getState();
let snap0 = snap(s0.world, ["W"]);
store.dispatch({ type: "PAINT_BRUSH", payload: { x: 3, y: 3, radius: 2, mode: "toxin" } });
let s1 = store.getState();
assertUnchanged(snap0, "PAINT_BRUSH");
assertReplaced(snap0, s1.world, ["W"], "PAINT_BRUSH");

// PLACE_CELL must not mutate previous arrays.
s0 = store.getState();
snap0 = snap(s0.world, ["alive", "E", "reserve", "link", "lineageId", "trait", "hue", "born", "died", "age"]);
store.dispatch({ type: "PLACE_CELL", payload: { x: 2, y: 2, remove: false } });
s1 = store.getState();
assertUnchanged(snap0, "PLACE_CELL");
assertReplaced(snap0, s1.world, ["alive", "E", "reserve", "link", "lineageId", "trait", "hue", "born", "died", "age"], "PLACE_CELL");

console.log("INTERACTION_GATES_OK no in-place TypedArray mutation for UI actions");

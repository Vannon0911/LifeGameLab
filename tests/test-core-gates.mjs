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
  if (!ta || !ArrayBuffer.isView(ta)) return 0;
  const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  const seg = 1024;
  if (u8.length <= seg * 3) return hashBytesFNV1a(u8);
  const head = u8.subarray(0, seg);
  const midStart = Math.max(0, ((u8.length / 2) | 0) - (seg >> 1));
  const mid = u8.subarray(midStart, midStart + seg);
  const tail = u8.subarray(u8.length - seg);
  // Combine hashes so collisions are less likely than a single segment.
  const a = hashBytesFNV1a(head);
  const b = hashBytesFNV1a(mid);
  const c = hashBytesFNV1a(tail);
  return (a ^ ((b << 1) | (b >>> 31)) ^ ((c << 7) | (c >>> 25))) >>> 0;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function snapshotWorldArrays(world, keys) {
  const out = {};
  for (const k of keys) {
    const v = world?.[k];
    assert(ArrayBuffer.isView(v), `expected TypedArray at world.${k}`);
    out[k] = { ref: v, hash: hashTypedArraySampled(v), len: v.length };
  }
  return out;
}

function assertUnchanged(snap, label) {
  for (const k of Object.keys(snap)) {
    const { ref, hash, len } = snap[k];
    assert(ref.length === len, `${label}: old world.${k} length changed (mutation bypass)`);
    const h2 = hashTypedArraySampled(ref);
    assert(h2 === hash, `${label}: old world.${k} content changed (mutation bypass)`);
  }
}

function assertReplaced(prevSnap, nextWorld, label) {
  for (const k of Object.keys(prevSnap)) {
    const prevRef = prevSnap[k].ref;
    const nextRef = nextWorld?.[k];
    assert(nextRef && ArrayBuffer.isView(nextRef), `${label}: missing next world.${k}`);
    assert(nextRef !== prevRef, `${label}: world.${k} reference was not replaced (still writable store-owned TA)`);
  }
}

const SEED = "core-gates-1";
const MUT_KEYS = ["L", "E", "R", "W", "Sat", "P", "B", "reserve", "link", "alive", "hue", "lineageId", "trait", "age", "born", "died"];

const store = createStore(manifest, { reducer, simStep: simStepPatch });
store.dispatch({ type: "SET_SEED", payload: SEED });
store.dispatch({ type: "GEN_WORLD" });
store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });

const s0 = store.getState();
const snap0 = snapshotWorldArrays(s0.world, MUT_KEYS);

store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const s1 = store.getState();
assertUnchanged(snap0, "step1");
assertReplaced(snap0, s1.world, "step1");

const snap1 = snapshotWorldArrays(s1.world, MUT_KEYS);
store.dispatch({ type: "SIM_STEP", payload: { force: true } });
const s2 = store.getState();
assertUnchanged(snap1, "step2");
assertReplaced(snap1, s2.world, "step2");

console.log("CORE_GATES_OK no TypedArray mutation bypass across SIM_STEP");

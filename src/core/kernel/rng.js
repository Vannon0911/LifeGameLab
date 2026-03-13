// ============================================================
// RNG — Deterministic hash-based random
// Combined 03.03. and 08.03. versions
// ============================================================

import { hash32 } from "./hash32.js";

// --- 08.03. Utilities ---
export function hashMix32(seed, stream = 0) {
  let x = (seed >>> 0) ^ (Math.imul((stream | 0) + 1, 0x9e3779b9) >>> 0);
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return x >>> 0;
}

export function rng01(seed, stream = 0) {
  return (hashMix32(seed, stream) & 0x00ffffff) / 0x01000000;
}

export function hashString(s) {
  const str = String(s ?? "");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// --- 03.03. Streams ---
function xorshift32(seed) {
  let x = seed >>> 0;
  return function next() {
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    return x >>> 0;
  };
}

export function createRngStreams(seedStr) {
  const base = parseInt(hash32(String(seedStr || "")), 16) >>> 0;
  return createRngStreamsFromBase(seedStr, base);
}

export function createRngStreamsScoped(seedStr, scope = "default") {
  const scopedSeed = `${String(seedStr || "")}::${String(scope || "default")}`;
  const base = parseInt(hash32(scopedSeed), 16) >>> 0;
  return createRngStreamsFromBase(scopedSeed, base);
}

function createRngStreamsFromBase(seedStr, base) {
  const mk = (salt) => {
    const s = (base ^ (parseInt(hash32(seedStr + ":" + salt), 16) >>> 0)) >>> 0;
    const gen = xorshift32(s || 0x12345678);
    return {
      u32: () => gen(),
      f01: () => gen() / 4294967296,
      int: (min, max) => {
        const r = gen() / 4294967296;
        return Math.floor(min + r * (max - min));
      }
    };
  };
  return { world: mk("world"), sim: mk("sim"), cos: mk("cos") };
}

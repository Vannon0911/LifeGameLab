import { TRAIT_COUNT } from "../life.data.js";
import { clamp } from "../shared.js";

export function expansionWorkGain(sim) {
  const births = Number(sim?.birthsLastStep || 0);
  const alive = Math.max(0, Number(sim?.aliveRatio || 0));
  const diversity = Math.max(0, Number(sim?.lineageDiversity || 0));
  const evo = Math.max(1, Number(sim?.evolutionStageMean || 1));
  const toxin = Math.max(0, Number(sim?.meanToxinField || 0));
  const sat = Math.max(0, Number(sim?.meanSaturationField || 0));
  const pressurePenalty = clamp(toxin * 1.2 + sat * 0.9, 0, 1.9);
  return Math.max(
    0,
    births * 0.38 +
    Math.max(0, alive - 0.10) * 7.5 +
    Math.max(0, diversity - 1) * 0.14 +
    Math.max(0, evo - 1) * 0.35 -
    pressurePenalty
  );
}

export function expansionWorkCost(world, sim) {
  const w = Math.max(1, Number(world?.w || 1));
  const h = Math.max(1, Number(world?.h || 1));
  const count = Math.max(0, Number(sim?.expansionCount || 0));
  return 120 + (w + h) * 1.25 + count * 96;
}

export function shouldAutoExpand(world, sim, tick) {
  const w = world?.w | 0;
  const h = world?.h | 0;
  if (w <= 0 || h <= 0) return false;
  if (w >= 128 || h >= 128) return false;
  if ((sim?.expansionWork || 0) < expansionWorkCost(world, sim)) return false;
  if ((sim?.lastExpandTick ?? -99999) + 120 > tick) return false;

  const alive = world.alive;
  const hue = world.hue;
  const born = world.born || world.alive;
  const N = w * h;
  const aliveRatio = (sim?.aliveCount ?? 0) / Math.max(1, N);
  let dominantHueRatio = 0;
  if (alive && hue) {
    const bins = new Uint32Array(12);
    let live = 0;
    for (let i = 0; i < alive.length; i++) {
      if (alive[i] !== 1) continue;
      live++;
      const h0 = Number(hue[i]) || 0;
      const b = (((h0 % 360) + 360) % 360 / 30) | 0;
      bins[b]++;
    }
    if (live > 0) {
      let maxBin = 0;
      for (let b = 0; b < 12; b++) if (bins[b] > maxBin) maxBin = bins[b];
      dominantHueRatio = maxBin / live;
    }
  }
  if (dominantHueRatio < 0.9) return false;
  if (aliveRatio > 0.74) return true;

  let edgeActive = 0;
  let edgeCells = 0;
  for (let x = 0; x < w; x++) {
    const top = x;
    const bot = (h - 1) * w + x;
    edgeCells += 2;
    if (alive[top] === 1 || born[top] === 1) edgeActive++;
    if (alive[bot] === 1 || born[bot] === 1) edgeActive++;
  }
  for (let y = 1; y < h - 1; y++) {
    const left = y * w;
    const right = left + (w - 1);
    edgeCells += 2;
    if (alive[left] === 1 || born[left] === 1) edgeActive++;
    if (alive[right] === 1 || born[right] === 1) edgeActive++;
  }
  const edgePressure = edgeActive / Math.max(1, edgeCells);
  return edgePressure > 0.07 || (aliveRatio > 0.58 && edgePressure > 0.03);
}

export function expandWorldPreserve(world, step = 1) {
  const oldW = world.w | 0;
  const oldH = world.h | 0;
  const newW = oldW + step;
  const newH = oldH + step;
  const offX = ((newW - oldW) / 2) | 0;
  const offY = ((newH - oldH) / 2) | 0;
  const oldN = oldW * oldH;
  const newN = newW * newH;

  const next = { ...world, w: newW, h: newH };
  const copy1 = (src, ctor) => {
    const out = new ctor(newN);
    for (let y = 0; y < oldH; y++) {
      const srcBase = y * oldW;
      const dstBase = (y + offY) * newW + offX;
      out.set(src.subarray(srcBase, srcBase + oldW), dstBase);
    }
    return out;
  };

  next.alive = copy1(world.alive, Uint8Array);
  next.E = copy1(world.E, Float32Array);
  next.L = copy1(world.L, Float32Array);
  next.R = copy1(world.R, Float32Array);
  next.W = copy1(world.W, Float32Array);
  next.water = copy1(world.water || new Float32Array(oldN), Float32Array);
  next.Sat = copy1(world.Sat || new Float32Array(oldN), Float32Array);
  next.baseSat = copy1(world.baseSat || new Float32Array(oldN), Float32Array);
  next.P = copy1(world.P || new Float32Array(oldN), Float32Array);
  next.B = copy1(world.B || new Float32Array(oldN), Float32Array);
  next.biomeId = copy1(world.biomeId || new Int8Array(oldN), Int8Array);
  next.plantKind = copy1(world.plantKind || new Int8Array(oldN), Int8Array);
  next.reserve = copy1(world.reserve || new Float32Array(oldN), Float32Array);
  next.link = copy1(world.link || new Float32Array(oldN), Float32Array);
  next.superId = copy1(world.superId || new Int32Array(oldN), Int32Array);
  next.clusterField = copy1(world.clusterField || new Float32Array(oldN), Float32Array);
  next.actionMap = copy1(world.actionMap || new Uint8Array(oldN), Uint8Array);
  next.zoneMap = copy1(world.zoneMap || new Int8Array(oldN), Int8Array);
  next.coreZoneMask = copy1(world.coreZoneMask || new Uint8Array(oldN), Uint8Array);
  next.dnaZoneMask = copy1(world.dnaZoneMask || new Uint8Array(oldN), Uint8Array);
  next.hue = copy1(world.hue || new Float32Array(oldN), Float32Array);
  next.lineageId = copy1(world.lineageId || new Uint32Array(oldN), Uint32Array);
  next.age = copy1(world.age || new Uint16Array(oldN), Uint16Array);
  next.born = copy1(world.born || new Uint8Array(oldN), Uint8Array);
  next.died = copy1(world.died || new Uint8Array(oldN), Uint8Array);
  next.lineageThreatMemory = { ...(world.lineageThreatMemory || {}) };
  next.lineageDefenseReadiness = { ...(world.lineageDefenseReadiness || {}) };
  next.clusterAttackState = { ...(world.clusterAttackState || {}) };

  const traits = new Float32Array(newN * TRAIT_COUNT);
  const srcTraits = world.trait || new Float32Array(oldN * TRAIT_COUNT);
  for (let y = 0; y < oldH; y++) {
    for (let x = 0; x < oldW; x++) {
      const s = y * oldW + x;
      const d = (y + offY) * newW + (x + offX);
      traits.set(srcTraits.subarray(s * TRAIT_COUNT, s * TRAIT_COUNT + TRAIT_COUNT), d * TRAIT_COUNT);
    }
  }
  next.trait = traits;
  return next;
}

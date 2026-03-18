import { rng01, hashMix32 } from "../../kernel/determinism/rng.js";
import { clamp, wrapHue, renormTraits, defaultLineageMemory } from "./shared.js";
import { TRAIT_DEFAULT, TRAIT_COUNT } from "./life.data.js";
import { LINEAGE_PRUNE_AGE, MAX_LINEAGE_MEMORY } from "./constants.js";

const TRAITS = TRAIT_COUNT;

export function updateLineageMemory(world, i, outcome = 1, tick = 0) {
  const lid = Number(world.lineageId[i]) | 0;
  if (lid === 0) return;
  if (!world.lineageMemory) world.lineageMemory = {};
  let m = world.lineageMemory[lid];
  if (!m) { m = defaultLineageMemory(); world.lineageMemory[lid] = m; }
  if (outcome > 0 && m.lastTickUpdated === tick) return;

  m.lastTickUpdated = tick;
  m.lastSeenTick = tick;
  const slow = 0.0012;
  m.light += (clamp(world.L[i], 0, 1) - m.light) * slow;
  m.nutrient += (clamp(world.R[i], 0, 1) - m.nutrient) * slow;
  m.toxin += (clamp(world.W[i], 0, 1) - m.toxin) * slow;

  const toxTarget = clamp((clamp(world.W[i], 0, 1) * 0.85 + clamp(world.R[i], 0, 1) * 0.15), 0, 1);
  const toxLearn = 0.006 + slow * 3.5;
  m.toxinMetabolism = clamp((m.toxinMetabolism || 0) + (toxTarget - (m.toxinMetabolism || 0)) * toxLearn, 0, 1);

  m.xp += Math.max(0, (0.010 + (1 - Math.abs(world.L[i] - m.light)) * 0.022) * (outcome > 0 ? 1 : 0.55));
  const stage = Math.max(1, Math.floor(1 + Math.log2(1 + m.xp * 0.075)));
  m.stageProgress = clamp((m.xp || 0) * 0.01, 0, 1);
  m.stage = stage;
}

export function pruneLineageMemory(world, tick) {
  const mem = world.lineageMemory;
  if (!mem) return;

  const lids = Object.keys(mem).map((k) => Number(k) | 0).filter((n) => n > 0).sort((a, b) => a - b);
  for (let k = 0; k < lids.length; k++) {
    const lid = lids[k];
    const m = mem[lid];
    const lastSeen = Number(m?.lastSeenTick ?? -1);
    if (lastSeen >= 0 && (tick - lastSeen) > LINEAGE_PRUNE_AGE) delete mem[lid];
  }
  const lids2 = Object.keys(mem).map((k) => Number(k) | 0).filter((n) => n > 0).sort((a, b) => a - b);
  if (lids2.length > MAX_LINEAGE_MEMORY) {
    const scored = lids2.map((lid) => {
      const m = mem[lid] || {};
      return { lid, xp: Number(m.xp || 0), seen: Number(m.lastSeenTick ?? -1) };
    });
    scored.sort((a, b) => (a.xp - b.xp) || (a.seen - b.seen) || (a.lid - b.lid));
    const remove = scored.length - MAX_LINEAGE_MEMORY;
    for (let r = 0; r < remove; r++) delete mem[scored[r].lid];
  }
}

export function mutateNewbornByEnvironment(world, phy, tick, parent, child) {
  const { W, E, trait, lineageId, hue } = world;
  const lid = Number(lineageId[parent]) | 0;
  const mem = (world.lineageMemory && world.lineageMemory[lid]);
  const chance = clamp(0.06 + clamp(W[child] * 0.9, 0, 1.8) * 0.22, 0.04, 0.48);
  if (rng01(hashMix32(lid, tick ^ child), 4) > chance) return false;

  const base = 0.03;
  if (E[parent] < 0.1 || E[child] < 0.05) return false;
  E[parent] -= 0.07;
  E[child] -= 0.03;

  const o = child * TRAITS;
  for (let k = 0; k < TRAITS; k++) trait[o + k] += (rng01(lid, tick * 13 + child + k) - 0.5) * base;
  renormTraits(trait, o);
  hue[child] = wrapHue(hue[parent] + (rng01(lid, child ^ tick) - 0.5) * 10);

  const stage = Number(mem?.stage || 1);
  const specChance = clamp(0.02 + chance * 0.10 + clamp((stage - 1) / 12, 0, 1) * 0.06, 0.01, 0.18);
  if (rng01(hashMix32(lid ^ 0x9e3779b9, tick + child * 17), 7) < specChance) {
    let next = Number(world.nextLineageId || 0) >>> 0;
    if (!next) next = ((hashMix32(lid, (tick ^ child) + 11) >>> 0) || 1);
    const newId = next === (lid >>> 0) ? ((next + 1) >>> 0) : next;
    world.nextLineageId = (newId + 1) >>> 0;
    lineageId[child] = newId >>> 0;
    if (!world.lineageMemory) world.lineageMemory = {};
    const baseMem = mem && typeof mem === "object" ? mem : defaultLineageMemory();
    const nm = { ...defaultLineageMemory(), ...baseMem };
    nm.xp = Math.max(0, Number(baseMem.xp || 0) * 0.15);
    nm.stage = Math.max(1, Math.floor(Number(baseMem.stage || 1)));
    nm.mutationScore = clamp(Number(baseMem.mutationScore || 0) + 0.05, 0, 1);
    nm.lastSeenTick = tick;
    nm.lastTickUpdated = tick;
    world.lineageMemory[newId] = nm;
  }

  return true;
}

export function seedTraitsDefault(trait, idx) {
  const o = idx * TRAITS;
  for (let t = 0; t < TRAITS; t++) trait[o + t] = TRAIT_DEFAULT[t];
}



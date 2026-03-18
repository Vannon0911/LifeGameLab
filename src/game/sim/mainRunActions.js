import { clamp, cloneTypedArray } from "./shared.js";
import { deriveStageState } from "./reducer/progression.js";

function findPlayerAnchors(world, playerLineageId, limit = 18) {
  const out = [];
  for (let i = 0; i < world.alive.length && out.length < limit; i++) {
    if (world.alive[i] !== 1) continue;
    if ((Number(world.lineageId[i]) | 0) !== playerLineageId) continue;
    out.push(i);
  }
  return out;
}

function applyIndices(indices, world, next, mutate) {
  let changed = 0;
  for (const idx of indices) changed += mutate(idx, world, next) ? 1 : 0;
  return changed;
}

function collectActionIndices(world, anchors, radius = 2) {
  const out = new Set();
  const w = Number(world.w || 0) | 0;
  const h = Number(world.h || 0) | 0;
  for (const idx of anchors) {
    const x = idx % w;
    const y = (idx / w) | 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        out.add(yy * w + xx);
      }
    }
  }
  return [...out];
}

function buildPatchedSim(state, simPatch, nextWorld) {
  const simLike = { ...state.sim, ...simPatch };
  const nextStageState = deriveStageState(nextWorld, simLike, state.meta);
  return { ...simLike, ...nextStageState };
}

function finalizeAction(state, actionType, nextWorld, simPatch, worldPatchEntries) {
  const nextSim = buildPatchedSim(state, simPatch, nextWorld);
  const patches = [
    ...worldPatchEntries,
    ...Object.keys(simPatch).map((key) => ({ op: "set", path: `/sim/${key}`, value: simPatch[key] })),
    { op: "set", path: "/sim/meanWaterField", value: nextSim.meanWaterField },
    { op: "set", path: "/sim/stabilityScore", value: nextSim.stabilityScore },
    { op: "set", path: "/sim/ecologyScore", value: nextSim.ecologyScore },
    { op: "set", path: "/sim/stageProgressScore", value: nextSim.stageProgressScore },
    { op: "set", path: "/sim/activeBiomeCount", value: nextSim.activeBiomeCount },
  ];
  if (Number(nextSim.playerStage || 1) !== Number(state.sim.playerStage || 1)) {
    patches.push({ op: "set", path: "/sim/playerStage", value: nextSim.playerStage });
  }
  if (nextWorld.lineageMemory !== state.world.lineageMemory) {
    patches.push({ op: "set", path: "/world/lineageMemory", value: nextWorld.lineageMemory });
  }
  return patches;
}

export function handleHarvestPulse(state, action) {
  const world = state.world;
  if (!world) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const anchors = findPlayerAnchors(world, playerLineageId);
  if (!anchors.length) return [];
  const P = cloneTypedArray(world.P);
  const R = cloneTypedArray(world.R);
  const Sat = cloneTypedArray(world.Sat);
  const nextWorld = { ...world, P, R, Sat, lineageMemory: JSON.parse(JSON.stringify(world.lineageMemory || {})) };
  const indices = collectActionIndices(world, anchors, 2);

  let yieldTotal = 0;
  const changed = applyIndices(indices, world, nextWorld, (idx, src, dst) => {
    const plant = Number(src.P[idx] || 0);
    const nutrient = Number(src.R[idx] || 0);
    const water = Number(src.water?.[idx] || 0);
    if (plant <= 0.03 && nutrient <= 0.02) return false;
    const harvest = (plant * 1.8 + nutrient * 0.9) * (0.8 + water * 0.6);
    dst.P[idx] = clamp(plant * 0.72, 0, 1);
    dst.R[idx] = clamp(nutrient * 0.90, 0, 1);
    dst.Sat[idx] = clamp(Number(src.Sat[idx] || 0) * 0.96, 0, 1);
    yieldTotal += harvest;
    return true;
  });
  if (!changed) return [];

  return finalizeAction(state, "HARVEST_PULSE", nextWorld, {
    playerDNA: Number(state.sim.playerDNA || 0) + yieldTotal * 0.30,
    harvestYieldTotal: Number(state.sim.harvestYieldTotal || 0) + yieldTotal,
  }, [
    { op: "set", path: "/world/P", value: P },
    { op: "set", path: "/world/R", value: R },
    { op: "set", path: "/world/Sat", value: Sat },
  ]);
}

export function handlePruneCluster(state) {
  const world = state.world;
  if (!world) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const anchors = findPlayerAnchors(world, playerLineageId);
  if (!anchors.length) return [];
  const P = cloneTypedArray(world.P);
  const W = cloneTypedArray(world.W);
  const nextWorld = { ...world, P, W, lineageMemory: JSON.parse(JSON.stringify(world.lineageMemory || {})) };
  const indices = collectActionIndices(world, anchors, 3);

  let yieldTotal = 0;
  const changed = applyIndices(indices, world, nextWorld, (idx, src, dst) => {
    const plant = Number(src.P[idx] || 0);
    const toxin = Number(src.W[idx] || 0);
    const cluster = Number(src.clusterField?.[idx] || 0);
    if (plant <= 0.08 && toxin <= 0.05) return false;
    const prune = (plant * 1.1 + toxin * 1.5) * (1 + cluster * 0.4);
    dst.P[idx] = clamp(plant * 0.62, 0, 1);
    dst.W[idx] = clamp(toxin * 0.78, 0, 1);
    yieldTotal += prune;
    return true;
  });
  if (!changed) return [];

  return finalizeAction(state, "PRUNE_CLUSTER", nextWorld, {
    playerDNA: Number(state.sim.playerDNA || 0) + yieldTotal * 0.16,
    pruneYieldTotal: Number(state.sim.pruneYieldTotal || 0) + yieldTotal,
  }, [
    { op: "set", path: "/world/P", value: P },
    { op: "set", path: "/world/W", value: W },
  ]);
}

export function handleRecyclePatch(state) {
  const world = state.world;
  if (!world) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const anchors = findPlayerAnchors(world, playerLineageId);
  if (!anchors.length) return [];
  const W = cloneTypedArray(world.W);
  const R = cloneTypedArray(world.R);
  const Sat = cloneTypedArray(world.Sat);
  const nextWorld = { ...world, W, R, Sat, lineageMemory: JSON.parse(JSON.stringify(world.lineageMemory || {})) };
  const indices = collectActionIndices(world, anchors, 2);

  let yieldTotal = 0;
  const changed = applyIndices(indices, world, nextWorld, (idx, src, dst) => {
    const toxin = Number(src.W[idx] || 0);
    const water = Number(src.water?.[idx] || 0);
    if (toxin <= 0.03) return false;
    const reclaimed = toxin * (0.95 + water * 0.55);
    dst.W[idx] = clamp(toxin * 0.46, 0, 1);
    dst.R[idx] = clamp(Number(src.R[idx] || 0) + reclaimed * 0.42, 0, 1);
    dst.Sat[idx] = clamp(Number(src.Sat[idx] || 0) + reclaimed * 0.10, 0, 1);
    yieldTotal += reclaimed;
    return true;
  });
  if (!changed) return [];

  return finalizeAction(state, "RECYCLE_PATCH", nextWorld, {
    recycleYieldTotal: Number(state.sim.recycleYieldTotal || 0) + yieldTotal,
    playerDNA: Number(state.sim.playerDNA || 0) + yieldTotal * 0.14,
  }, [
    { op: "set", path: "/world/W", value: W },
    { op: "set", path: "/world/R", value: R },
    { op: "set", path: "/world/Sat", value: Sat },
  ]);
}

export function handleSeedSpread(state) {
  const world = state.world;
  if (!world) return [];
  const playerLineageId = Number(state.meta.playerLineageId || 1) | 0;
  const anchors = findPlayerAnchors(world, playerLineageId);
  if (!anchors.length) return [];
  const P = cloneTypedArray(world.P);
  const R = cloneTypedArray(world.R);
  const B = cloneTypedArray(world.B);
  const nextWorld = { ...world, P, R, B, lineageMemory: JSON.parse(JSON.stringify(world.lineageMemory || {})) };
  const indices = collectActionIndices(world, anchors, 3);

  let yieldTotal = 0;
  const changed = applyIndices(indices, world, nextWorld, (idx, src, dst) => {
    const water = Number(src.water?.[idx] || 0);
    const biome = Number(src.biomeId?.[idx] || 0);
    const biomeBoost = biome === 1 || biome === 2 ? 0.14 : biome === 3 ? 0.04 : 0.08;
    const seedGain = 0.08 + water * 0.12 + biomeBoost;
    if (seedGain <= 0.09) return false;
    dst.P[idx] = clamp(Number(src.P[idx] || 0) + seedGain, 0, 1);
    dst.R[idx] = clamp(Number(src.R[idx] || 0) + seedGain * 0.22, 0, 1);
    dst.B[idx] = clamp(Number(src.B[idx] || 0) + seedGain * 0.10, 0, 1);
    yieldTotal += seedGain;
    return true;
  });
  if (!changed) return [];

  return finalizeAction(state, "SEED_SPREAD", nextWorld, {
    seedYieldTotal: Number(state.sim.seedYieldTotal || 0) + yieldTotal,
    playerDNA: Math.max(0, Number(state.sim.playerDNA || 0) - 0.25),
  }, [
    { op: "set", path: "/world/P", value: P },
    { op: "set", path: "/world/R", value: R },
    { op: "set", path: "/world/B", value: B },
  ]);
}


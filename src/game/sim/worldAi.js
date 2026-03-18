import { clamp } from "./shared.js";
import { hashMix32 } from "../../kernel/determinism/rng.js";
import { TRAIT_COUNT, TRAIT_DEFAULT } from "./life.data.js";

const AI_MODE_HOLD = 0;
const AI_MODE_EXPAND = 1;
const AI_MODE_PRESSURE = 2;
const CLUSTER_ATTACK_BUDGET_MAX = 1.1;

function getBalanceGovernor(world) {
  const { w, h, R, W, P, Sat } = world;
  const N = Math.max(1, w * h);
  let sR = 0, sW = 0, sP = 0, sSat = 0;
  for (let i = 0; i < N; i++) { sR += R[i]; sW += W[i]; sP += P[i]; sSat += Sat[i]; }
  const meanR = clamp(sR / N, 0, 1);
  const meanW = clamp(sW / N, 0, 1);
  const meanP = clamp(sP / N, 0, 1);
  const meanSat = clamp(sSat / N, 0, 1);
  const desiredPlants = clamp(
    0.96 +
      clamp((0.26 - meanR) / 0.26, 0, 1) * 0.06 -
      clamp(meanW * 1.15 + meanSat * 0.70, 0, 1.6) * 0.04 -
      clamp((meanP - 0.20) / 0.24, 0, 1) * 0.08,
    0.78,
    1.04
  );
  const prev = world.balanceGovernor?.plants ?? desiredPlants;
  const plants = prev + (desiredPlants - prev) * 0.02;
  return (world.balanceGovernor = { plants });
}

function ensureClusterAttackState(world) {
  if (!world.clusterAttackState || typeof world.clusterAttackState !== "object") {
    world.clusterAttackState = {};
  }
  return world.clusterAttackState;
}

function getLineageCentroid(world, lineage) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let i = 0; i < N; i++) {
    if ((Number(world?.alive?.[i] || 0) | 0) !== 1) continue;
    if ((Number(world?.lineageId?.[i] || 0) | 0) !== (lineage | 0)) continue;
    sumX += i % w;
    sumY += (i / w) | 0;
    count++;
  }
  if (!count) return null;
  return { x: sumX / count, y: sumY / count, count };
}

function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function collectCpuExpandCandidates(world, cpuLid) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  const cpuSeeds = [];
  for (let i = 0; i < N; i++) {
    if ((Number(world?.alive?.[i] || 0) | 0) !== 1) continue;
    if ((Number(world?.lineageId?.[i] || 0) | 0) !== (cpuLid | 0)) continue;
    cpuSeeds.push(i);
  }
  if (!cpuSeeds.length) return [];
  const candidates = new Set();
  for (let s = 0; s < cpuSeeds.length; s++) {
    const idx = cpuSeeds[s];
    const x = idx % w;
    const y = (idx / w) | 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if ((Number(world?.alive?.[j] || 0) | 0) === 1) continue;
        candidates.add(j);
      }
    }
  }
  return [...candidates];
}

function spawnCpuExpansionCells(world, tick, cpuLid, playerLid, maxSpawn = 3) {
  const w = Number(world?.w || 0) | 0;
  const cpuCentroid = getLineageCentroid(world, cpuLid);
  const playerCentroid = getLineageCentroid(world, playerLid);
  if (!cpuCentroid || !playerCentroid) return 0;
  const targetX = playerCentroid.x;
  const targetY = playerCentroid.y;
  const cands = collectCpuExpandCandidates(world, cpuLid);
  if (!cands.length) return 0;

  cands.sort((a, b) => {
    const ax = a % w;
    const ay = (a / w) | 0;
    const bx = b % w;
    const by = (b / w) | 0;
    const da = distanceSq(ax, ay, targetX, targetY);
    const db = distanceSq(bx, by, targetX, targetY);
    if (da !== db) return da - db;
    return a - b;
  });

  let spawned = 0;
  for (let i = 0; i < cands.length && spawned < maxSpawn; i++) {
    const idx = cands[i];
    if ((Number(world?.alive?.[idx] || 0) | 0) === 1) continue;
    world.alive[idx] = 1;
    world.E[idx] = 0.38;
    world.reserve[idx] = 0.10;
    world.link[idx] = 0;
    world.lineageId[idx] = cpuLid >>> 0;
    world.hue[idx] = 0;
    world.age[idx] = 0;
    if (world.born) world.born[idx] = 1;
    if (world.died) world.died[idx] = 0;
    const o = idx * TRAIT_COUNT;
    for (let t = 0; t < TRAIT_COUNT; t++) world.trait[o + t] = TRAIT_DEFAULT[t];
    spawned++;
  }
  void tick;
  return spawned;
}

function resolveAiMode(phy, tick) {
  const baseMode = Number(hashMix32(Number(phy?.worldSeedHash || 0) >>> 0, Math.floor(Number(tick || 0) / 90)) % 3) | 0;
  const playerAlive = Number(phy?.playerAliveCount || 0);
  const cpuAlive = Number(phy?.cpuAliveCount || 0);
  if (playerAlive > cpuAlive * 1.5) return AI_MODE_PRESSURE;
  return baseMode;
}

export function applyWorldAi(world, tick, phy = {}) {
  getBalanceGovernor(world);
  const cpuLid = (Number(phy?.cpuLineageId || 0) | 0) || 2;
  const playerLid = (Number(phy?.playerLineageId || 0) | 0) || 1;
  const mode = resolveAiMode(phy, tick);

  if (mode === AI_MODE_HOLD) return;
  if (mode === AI_MODE_EXPAND) {
    spawnCpuExpansionCells(world, tick, cpuLid, playerLid, 3);
    return;
  }
  const state = ensureClusterAttackState(world);
  const key = String(cpuLid);
  const prev = state[key] && typeof state[key] === "object" ? state[key] : { cooldown: 0, budget: 0.4 };
  state[key] = { ...prev, budget: CLUSTER_ATTACK_BUDGET_MAX };
}


import { clamp } from "./shared.js";
import { diffuse, applySeasonalLightAnchor } from "./fields.js";
import { applyPlantLifecycle, enforcePlantTileCap } from "./plants.js";
import { enforceNutrientCap, enforceCellOnlyEnergy } from "./resources.js";
import { applyWorldAi } from "./worldAi.js";
import { applyDynamicDamping } from "./damping.js";
import { computeClusterAndLinks } from "./network.js";
import { PLANT_ACTIVE_THRESHOLD } from "./constants.js";
import { ZONE_ROLE } from "../contracts/ids.js";
import { hasZoneRole } from "./canonicalZones.js";
import { scanCellTopologyPatterns } from "./cellPatterns.js";

// Pre-computed circular offset masks keyed by radius
const _circleMaskCache = new Map();

function getCircleMask(r) {
  let offsets = _circleMaskCache.get(r);
  if (offsets) return offsets;
  offsets = [];
  const rr = r * r;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= rr) offsets.push(dx, dy);
    }
  }
  _circleMaskCache.set(r, offsets);
  return offsets;
}

function applyCircularVision(mask, w, h, idx, radius) {
  const r = Math.max(0, Number(radius) | 0);
  if (r <= 0) {
    mask[idx] = 1;
    return;
  }
  const x = idx % w;
  const y = (idx / w) | 0;
  const offsets = getCircleMask(r);
  for (let k = 0; k < offsets.length; k += 2) {
    const xx = x + offsets[k];
    const yy = y + offsets[k + 1];
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    mask[yy * w + xx] = 1;
  }
}

function recomputeVisibility(world, phy) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  if (!N || !world?.alive || !world?.lineageId) return;
  if (!world.visibility || world.visibility.length !== N) world.visibility = new Uint8Array(N);
  if (!world.explored || world.explored.length !== N) world.explored = new Uint8Array(N);

  const visibility = world.visibility;
  const explored = world.explored;
  visibility.fill(0);

  const playerLineageId = Number(phy?.playerLineageId || 0) | 0;
  const radiusCore = Math.max(0, Number(phy?.visionRadiusCore || 0) | 0);
  const radiusDNA = Math.max(0, Number(phy?.visionRadiusDNA || 0) | 0);
  const radiusInfra = Math.max(0, Number(phy?.visionRadiusInfra || 0) | 0);
  for (let i = 0; i < N; i++) {
    if ((Number(world.lineageId[i]) | 0) !== playerLineageId) continue;
    if (hasZoneRole(world, i, ZONE_ROLE.CORE)) applyCircularVision(visibility, w, h, i, radiusCore);
    if (hasZoneRole(world, i, ZONE_ROLE.DNA)) applyCircularVision(visibility, w, h, i, radiusDNA);
    if (hasZoneRole(world, i, ZONE_ROLE.INFRA)) applyCircularVision(visibility, w, h, i, radiusInfra);
  }
  for (let i = 0; i < N; i++) {
    if ((Number(visibility[i]) | 0) === 1) explored[i] = 1;
  }
}

export function runFieldPhase(world, phy, tick, traitHarvestFn) {
  const { w, h, alive, L, R, W, P, B, trait, lineageId } = world;
  const N = w * h;
  const Sat = world.Sat;

  diffuse(L, w, h, phy.L_diffusion);
  applySeasonalLightAnchor(world, phy, tick);

  for (let i = 0; i < N; i++) if (P[i] > 0.01) R[i] = Math.min(1.0, R[i] + P[i] * phy.R_gen);
  diffuse(R, w, h, phy.R_diff);
  diffuse(W, w, h, phy.W_diff);

  const bDecay = clamp(Number(phy.B_decay ?? 0.045), 0, 1);
  for (let i = 0; i < N; i++) {
    const p = clamp(P[i], 0, 1);
    const live = alive[i] === 1 ? 1 : 0;
    const gen = p * 0.006 + live * clamp(L[i], 0, 1) * 0.003 * clamp(traitHarvestFn(trait, i), 0.22, 3.2);
    B[i] = clamp(B[i] * (1 - bDecay) + gen, 0, 1);
  }
  diffuse(B, w, h, clamp(Number(phy.B_diff ?? 0.04), 0, 1));
  diffuse(P, w, h, 0.01);

  const nutrientCappedTilesLastStep = enforceNutrientCap(world);
  let sumR = 0;
  let sumW = 0;
  let sumSat = 0;
  let sumP = 0;
  let sumB = 0;
  let plantTiles = 0;
  let maxLidSeen = 0;

  for (let i = 0; i < N; i++) {
    R[i] = Math.max(0, R[i] * (1 - phy.R_decay) - (alive[i] === 1 ? 0.0038 : 0.0009));
    W[i] = Math.max(0, W[i] * (1 - phy.W_decay));
    Sat[i] = clamp(Sat[i] + (world.baseSat[i] - Sat[i]) * 0.035 + P[i] * 0.0045 - L[i] * 0.0065, 0, 1);

    const pv = P[i];
    sumR += R[i];
    sumW += W[i];
    sumSat += Sat[i];
    sumP += pv;
    sumB += B[i];
    if (pv >= PLANT_ACTIVE_THRESHOLD) plantTiles++;
    const lid = Number(lineageId?.[i] || 0) >>> 0;
    if (lid > maxLidSeen) maxLidSeen = lid;
  }

  if (!Number.isFinite(Number(world.nextLineageId)) || (Number(world.nextLineageId) | 0) <= 0) {
    world.nextLineageId = ((maxLidSeen + 1) >>> 0) || 1;
  } else if ((Number(world.nextLineageId) >>> 0) <= maxLidSeen) {
    world.nextLineageId = (maxLidSeen + 1) >>> 0;
  }

  return {
    nutrientCappedTilesLastStep,
    sumR,
    sumW,
    sumSat,
    sumP,
    sumB,
    plantTiles,
  };
}

export function runWorldSystemsPhase(world, phy, tick, options = {}) {
  void options;
  applyPlantLifecycle(world, phy, tick);
  const plantsPrunedLastStep = enforcePlantTileCap(world);
  applyWorldAi(world, tick, phy);
  applyDynamicDamping(world);
  computeClusterAndLinks(world, phy);
  recomputeVisibility(world, phy);
  const cellPatternCounts = scanCellTopologyPatterns(world, Number(phy?.playerLineageId || 0) | 0);
  return { plantsPrunedLastStep, cellPatternCounts };
}

export function runFinalizePopulationPhase(world, phy) {
  const { alive, lineageId } = world;
  const N = world.w * world.h;
  const playerLid = (phy.playerLineageId | 0) || 0;
  const cpuLid = (phy.cpuLineageId | 0) || 0;
  const energyClearedTilesLastStep = enforceCellOnlyEnergy(world);

  let aliveCount = 0;
  let playerAliveCount = 0;
  let cpuAliveCount = 0;
  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1) continue;
    aliveCount++;
    const lid = Number(lineageId[i]) | 0;
    if (playerLid && lid === playerLid) playerAliveCount++;
    if (cpuLid && lid === cpuLid) cpuAliveCount++;
  }

  return {
    energyClearedTilesLastStep,
    aliveCount,
    playerAliveCount,
    cpuAliveCount,
  };
}

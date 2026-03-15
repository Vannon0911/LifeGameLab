import { createEmptyPatternBonuses } from "./canonicalZones.js";

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function getPhaseEConfig(preset) {
  return preset?.phaseE || {};
}

function getZoneIndices(zoneId, zoneIdMap) {
  const indices = [];
  for (let i = 0; i < zoneIdMap.length; i++) {
    if ((Number(zoneIdMap[i]) | 0) === (zoneId | 0)) indices.push(i);
  }
  return indices;
}

function buildAdjacency(indices, w) {
  const indexSet = new Set(indices);
  const degreeByIndex = new Map();
  for (const idx of indices) {
    const x = idx % w;
    const neighbors = [];
    if (x > 0 && indexSet.has(idx - 1)) neighbors.push(idx - 1);
    if (x < w - 1 && indexSet.has(idx + 1)) neighbors.push(idx + 1);
    if (idx - w >= 0 && indexSet.has(idx - w)) neighbors.push(idx - w);
    if (indexSet.has(idx + w)) neighbors.push(idx + w);
    degreeByIndex.set(idx, neighbors.length);
  }
  return degreeByIndex;
}

function getBounds(indices, w) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const idx of indices) {
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x < bounds.minX) bounds.minX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y > bounds.maxY) bounds.maxY = y;
  }
  return bounds;
}

function isFilledRectangle(indices, w) {
  if (indices.length < 4) return false;
  const indexSet = new Set(indices);
  const bounds = getBounds(indices, w);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  if (width < 2 || height < 2) return false;
  if ((width * height) !== indices.length) return false;
  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      if (!indexSet.has(y * w + x)) return false;
    }
  }
  return true;
}

function isLine(indices, w) {
  if (indices.length < 3) return false;
  const bounds = getBounds(indices, w);
  return bounds.minX === bounds.maxX || bounds.minY === bounds.maxY;
}

function isLoop(indices, w) {
  if (indices.length < 4) return false;
  const degreeByIndex = buildAdjacency(indices, w);
  for (const degree of degreeByIndex.values()) {
    if (degree !== 2) return false;
  }
  return true;
}

function isBranch(indices, w) {
  if (indices.length < 4) return false;
  const degreeByIndex = buildAdjacency(indices, w);
  for (const degree of degreeByIndex.values()) {
    if (degree >= 3) return true;
  }
  return false;
}

function isDenseCluster(indices, w) {
  if (indices.length < 5) return false;
  const bounds = getBounds(indices, w);
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const density = indices.length / Math.max(1, width * height);
  return density >= 0.7;
}

function pushPattern(patterns, patternId, zoneId, anchor) {
  patterns[patternId].count += 1;
  patterns[patternId].zoneIds.push(zoneId);
  patterns[patternId].anchors.push(anchor);
}

export function derivePatternCatalog(zoneState, world) {
  const empty = {
    line: { count: 0, zoneIds: [], anchors: [] },
    block: { count: 0, zoneIds: [], anchors: [] },
    loop: { count: 0, zoneIds: [], anchors: [] },
    branch: { count: 0, zoneIds: [], anchors: [] },
    dense_cluster: { count: 0, zoneIds: [], anchors: [] },
  };
  const zoneMeta = zoneState?.zoneMeta || {};
  const zoneIdMap = zoneState?.zoneId;
  const w = Number(world?.w || 0) | 0;
  if (!zoneIdMap || !w) return empty;

  const zoneIds = Object.keys(zoneMeta)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  for (const zoneId of zoneIds) {
    const entry = zoneMeta[zoneId];
    if (!entry?.committed) continue;
    const indices = getZoneIndices(zoneId, zoneIdMap);
    if (!indices.length) continue;
    const anchor = Number(entry.anchors?.[0] ?? indices[0]) | 0;
    if (isLine(indices, w)) pushPattern(empty, "line", zoneId, anchor);
    if (isFilledRectangle(indices, w)) pushPattern(empty, "block", zoneId, anchor);
    if (isLoop(indices, w)) pushPattern(empty, "loop", zoneId, anchor);
    if (isBranch(indices, w)) pushPattern(empty, "branch", zoneId, anchor);
    if (isDenseCluster(indices, w)) pushPattern(empty, "dense_cluster", zoneId, anchor);
  }

  return empty;
}

export function derivePatternBonuses(patternCatalog, preset) {
  const bonuses = createEmptyPatternBonuses();
  const phaseE = getPhaseEConfig(preset);
  const weights = phaseE.patternWeights || {};
  const bonusScale = phaseE.bonusScale || {};
  const weightedCounts = {
    line: Number(patternCatalog?.line?.count || 0) * Number(weights.line || 1),
    block: Number(patternCatalog?.block?.count || 0) * Number(weights.block || 1),
    loop: Number(patternCatalog?.loop?.count || 0) * Number(weights.loop || 1),
    branch: Number(patternCatalog?.branch?.count || 0) * Number(weights.branch || 1),
    dense_cluster: Number(patternCatalog?.dense_cluster?.count || 0) * Number(weights.dense_cluster || 1),
  };

  bonuses.energy = clamp01(weightedCounts.line * 0.18 + weightedCounts.block * 0.12) * Number(bonusScale.energy || 1);
  bonuses.dna = clamp01(weightedCounts.loop * 0.18 + weightedCounts.branch * 0.08) * Number(bonusScale.dna || 1);
  bonuses.stability = clamp01(weightedCounts.block * 0.16 + weightedCounts.dense_cluster * 0.16) * Number(bonusScale.stability || 1);
  bonuses.vision = clamp01(weightedCounts.line * 0.12 + weightedCounts.branch * 0.14) * Number(bonusScale.vision || 1);
  bonuses.defense = clamp01(weightedCounts.loop * 0.12 + weightedCounts.dense_cluster * 0.14) * Number(bonusScale.defense || 1);
  bonuses.transport = clamp01(weightedCounts.line * 0.18 + weightedCounts.branch * 0.12) * Number(bonusScale.transport || 1);
  return bonuses;
}

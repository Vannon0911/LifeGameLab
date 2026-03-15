import { ZONE_ROLE } from "../contracts/ids.js";

function getRoleSeedOrder() {
  return [ZONE_ROLE.CORE, ZONE_ROLE.DNA, ZONE_ROLE.INFRA];
}

function normalizeBounds(bounds) {
  return {
    minX: Number(bounds.minX || 0),
    minY: Number(bounds.minY || 0),
    maxX: Number(bounds.maxX || 0),
    maxY: Number(bounds.maxY || 0),
  };
}

function isPlayerOwned(world, idx, playerLineageId) {
  return (Number(world?.alive?.[idx] || 0) | 0) === 1
    && (Number(world?.lineageId?.[idx] || 0) | 0) === (playerLineageId | 0);
}

function markLegacyRole(zoneRole, world, roleId, predicate) {
  for (let i = 0; i < zoneRole.length; i++) {
    if (!predicate(i)) continue;
    zoneRole[i] = roleId;
  }
}

function deriveRoleMapFromLegacy(world, playerLineageId) {
  const size = Number(world?.w || 0) * Number(world?.h || 0);
  const zoneRole = new Int8Array(size);
  markLegacyRole(zoneRole, world, ZONE_ROLE.INFRA, (idx) => (
    isPlayerOwned(world, idx, playerLineageId)
      && Number(world?.link?.[idx] || 0) > 0
  ));
  markLegacyRole(zoneRole, world, ZONE_ROLE.DNA, (idx) => (
    isPlayerOwned(world, idx, playerLineageId)
      && ((Number(world?.dnaZoneMask?.[idx] || 0) | 0) === 1)
  ));
  markLegacyRole(zoneRole, world, ZONE_ROLE.CORE, (idx) => (
    isPlayerOwned(world, idx, playerLineageId)
      && ((Number(world?.coreZoneMask?.[idx] || 0) | 0) === 1)
  ));
  return zoneRole;
}

function collectComponent(zoneRole, startIdx, roleId, w, h, visited) {
  const indices = [];
  const queue = [startIdx];
  visited[startIdx] = 1;
  while (queue.length) {
    const idx = queue.shift();
    indices.push(idx);
    const x = idx % w;
    const y = (idx / w) | 0;
    const neighbors = [
      idx - 1,
      idx + 1,
      idx - w,
      idx + w,
    ];
    if (x === 0) neighbors[0] = -1;
    if (x === w - 1) neighbors[1] = -1;
    if (y === 0) neighbors[2] = -1;
    if (y === h - 1) neighbors[3] = -1;
    for (const nextIdx of neighbors) {
      if (nextIdx < 0 || nextIdx >= zoneRole.length) continue;
      if (visited[nextIdx] === 1) continue;
      if ((Number(zoneRole[nextIdx]) | 0) !== roleId) continue;
      visited[nextIdx] = 1;
      queue.push(nextIdx);
    }
  }
  indices.sort((a, b) => a - b);
  return indices;
}

function buildZoneMetaEntry(indices, roleId, w) {
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
  for (const idx of indices) {
    const x = idx % w;
    const y = (idx / w) | 0;
    if (x < bounds.minX) bounds.minX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y > bounds.maxY) bounds.maxY = y;
  }
  return {
    role: roleId,
    tileCount: indices.length,
    anchors: indices.slice(0, Math.min(4, indices.length)),
    bounds: normalizeBounds(bounds),
    committed: true,
  };
}

export function createEmptyPatternBonuses() {
  return {
    energy: 0,
    dna: 0,
    stability: 0,
    vision: 0,
    defense: 0,
    transport: 0,
  };
}

export function deriveCanonicalZoneState(world, playerLineageId, sourceZoneRole = null) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const size = w * h;
  const zoneRole = sourceZoneRole && ArrayBuffer.isView(sourceZoneRole)
    ? new Int8Array(sourceZoneRole)
    : deriveRoleMapFromLegacy(world, playerLineageId);
  const zoneId = new Uint16Array(size);
  const zoneMeta = {};
  if (!size) return { zoneRole, zoneId, zoneMeta };

  const visited = new Uint8Array(size);
  let nextZoneId = 1;
  for (const roleId of getRoleSeedOrder()) {
    for (let i = 0; i < size; i++) {
      if ((Number(zoneRole[i]) | 0) !== roleId) continue;
      if (visited[i] === 1) continue;
      const indices = collectComponent(zoneRole, i, roleId, w, h, visited);
      const currentZoneId = nextZoneId++;
      for (const idx of indices) zoneId[idx] = currentZoneId;
      zoneMeta[currentZoneId] = buildZoneMetaEntry(indices, roleId, w);
    }
  }
  return { zoneRole, zoneId, zoneMeta };
}

import { ZONE_ROLE } from "../contracts/ids.js";
import { isCommittedInfraValue } from "./infra.js";

function forEachAdjacent4(idx, w, h, cb) {
  const x = idx % w;
  const y = (idx / w) | 0;
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];
  for (const [xx, yy] of neighbors) {
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    cb((yy * w) + xx);
  }
}

export function buildCanonicalZoneState(world) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const N = w * h;
  const zoneRole = new Uint8Array(N);
  const zoneId = new Int32Array(N);
  const zoneMeta = {};

  let coreCount = 0;
  let dnaCount = 0;
  let infraCount = 0;
  for (let i = 0; i < N; i++) {
    if ((Number(world?.coreZoneMask?.[i] || 0) | 0) === 1) {
      zoneRole[i] = ZONE_ROLE.CORE;
      zoneId[i] = 1;
      coreCount++;
      continue;
    }
    if ((Number(world?.dnaZoneMask?.[i] || 0) | 0) === 1) {
      zoneRole[i] = ZONE_ROLE.DNA;
      zoneId[i] = 2;
      dnaCount++;
      continue;
    }
    if (isCommittedInfraValue(world?.link?.[i])) {
      zoneRole[i] = ZONE_ROLE.INFRA;
      zoneId[i] = 3;
      infraCount++;
    }
  }

  if (coreCount > 0) zoneMeta[1] = { role: ZONE_ROLE.CORE, source: "coreZoneMask", tileCount: coreCount };
  if (dnaCount > 0) zoneMeta[2] = { role: ZONE_ROLE.DNA, source: "dnaZoneMask", tileCount: dnaCount };
  if (infraCount > 0) zoneMeta[3] = { role: ZONE_ROLE.INFRA, source: "link", tileCount: infraCount };

  return { zoneRole, zoneId, zoneMeta };
}

export function applyCanonicalZoneState(world) {
  const next = buildCanonicalZoneState(world);
  world.zoneRole = next.zoneRole;
  world.zoneId = next.zoneId;
  world.zoneMeta = next.zoneMeta;
  return next;
}

export function hasZoneRole(world, idx, role) {
  return (Number(world?.zoneRole?.[idx] || 0) | 0) === (role | 0);
}

export function hasAdjacentZoneRole4(world, idx, w, h, role) {
  let hit = false;
  forEachAdjacent4(idx, w, h, (j) => {
    if (!hit && hasZoneRole(world, j, role)) hit = true;
  });
  return hit;
}

export function countAlivePlayerZoneRole(world, role, playerLineageId) {
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  const zoneRole = world?.zoneRole;
  if (!alive || !lineageId || !zoneRole) return 0;
  let count = 0;
  for (let i = 0; i < zoneRole.length; i++) {
    if ((Number(zoneRole[i]) | 0) !== (role | 0)) continue;
    if ((Number(alive[i]) | 0) !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== (playerLineageId | 0)) continue;
    count++;
  }
  return count;
}

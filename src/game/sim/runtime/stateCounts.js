export function countAlivePlayerRoleCells(world, playerLineageId, roleId) {
  const zoneRole = world?.zoneRole;
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  if (!zoneRole || !alive || !lineageId) return 0;
  let count = 0;
  for (let i = 0; i < zoneRole.length; i++) {
    if ((Number(zoneRole[i]) | 0) !== (roleId | 0)) continue;
    if ((Number(alive[i]) | 0) !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== (playerLineageId | 0)) continue;
    count++;
  }
  return count;
}

export function countAlivePlayerMaskedCells(mask, world, playerLineageId) {
  const alive = world?.alive;
  const lineageId = world?.lineageId;
  if (!mask || !alive || !lineageId) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if ((Number(mask[i]) | 0) !== 1) continue;
    if ((Number(alive[i]) | 0) !== 1) continue;
    if ((Number(lineageId[i]) | 0) !== (playerLineageId | 0)) continue;
    count++;
  }
  return count;
}

export function countMaskOnes(mask) {
  if (!mask || !ArrayBuffer.isView(mask)) return 0;
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    if ((Number(mask[i]) | 0) === 1) count++;
  }
  return count;
}

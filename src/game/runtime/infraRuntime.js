import { ZONE_ROLE } from "../contracts/ids.js";
import { cloneTypedArray } from "../sim/shared.js";
import { hasAdjacentRoleTile4, isRoleMarked } from "../sim/grid/index.js";

export function getInfraCandidateMask(world, size) {
  if (world?.infraCandidateMask && ArrayBuffer.isView(world.infraCandidateMask)) {
    return cloneTypedArray(world.infraCandidateMask);
  }
  return new Uint8Array(size);
}

export function touchesCommittedInfraAnchor(world, idx, w, h) {
  return isRoleMarked(world?.zoneRole, idx, ZONE_ROLE.CORE)
    || isRoleMarked(world?.zoneRole, idx, ZONE_ROLE.DNA)
    || isRoleMarked(world?.zoneRole, idx, ZONE_ROLE.INFRA)
    || hasAdjacentRoleTile4(world?.zoneRole, idx, w, h, [ZONE_ROLE.CORE, ZONE_ROLE.DNA, ZONE_ROLE.INFRA]);
}

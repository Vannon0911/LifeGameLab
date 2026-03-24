import { clamp } from "./shared.js";
import { CORPSE_N_RELEASE, CORPSE_TOXIN_SPIKE, MAX_NUTRIENT_PER_TILE } from "./constants.js";
import { isCommittedInfraValue } from "./infra.js";

export function enforceNutrientCap(world, cap = MAX_NUTRIENT_PER_TILE) {
  const R = world.R;
  let capped = 0;
  for (let i = 0; i < R.length; i++) {
    if (R[i] > cap) { R[i] = cap; capped++; }
  }
  return capped;
}

export function enforceCellOnlyEnergy(world) {
  const { alive, E, reserve, link } = world;
  let cleared = 0;
  for (let i = 0; i < alive.length; i++) {
    if (alive[i] !== 1 && (E[i] !== 0 || reserve[i] !== 0 || link[i] !== 0)) {
      E[i] = 0;
      reserve[i] = 0;
      if (!isCommittedInfraValue(link[i])) link[i] = 0;
      cleared++;
    }
  }
  return cleared;
}

export function applyCorpseRelease(world, i) {
  world.R[i] = clamp(world.R[i] + CORPSE_N_RELEASE, 0, 1);
  world.W[i] = clamp(world.W[i] + CORPSE_TOXIN_SPIKE * 0.35, 0, 1);
}

import { getWorldPreset, isTileInStartWindow } from "../sim/worldPresets.js";
import { areIndicesConnected8 } from "../sim/grid/index.js";

export function evaluateFoundationEligibility(state) {
  const founderBudget = Math.max(0, Number(state?.sim?.founderBudget || 0) | 0);
  const founderPlaced = Math.max(0, Number(state?.sim?.founderPlaced || 0) | 0);
  const world = state?.world;
  if (!world?.alive || !world?.lineageId || !world?.founderMask) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount: 0,
      reason: "world_missing",
    };
  }

  const w = Number(world.w || state?.meta?.gridW || 0) | 0;
  const h = Number(world.h || state?.meta?.gridH || 0) | 0;
  if (w <= 0 || h <= 0) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount: 0,
      reason: "invalid_grid",
    };
  }

  const playerLineageId = Number(state?.meta?.playerLineageId || 1) | 0;
  const preset = getWorldPreset(state?.meta?.worldPresetId);
  const playerWindow = preset?.startWindows?.player;
  if (!playerWindow) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount: 0,
      reason: "window_missing",
    };
  }

  const founderIndices = [];
  for (let i = 0; i < world.founderMask.length; i++) {
    if ((Number(world.founderMask[i]) | 0) !== 1) continue;
    founderIndices.push(i);
  }
  const founderMaskCount = founderIndices.length;

  if (founderBudget !== 1 || founderPlaced !== 1) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount,
      reason: "counter_mismatch",
    };
  }
  if (founderMaskCount !== 1) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount,
      reason: "mask_count_mismatch",
    };
  }

  for (const idx of founderIndices) {
    if ((Number(world.alive[idx]) | 0) !== 1) {
      return {
        eligible: false,
        founderBudget,
        founderPlaced,
        founderMaskCount,
        reason: "founder_not_alive",
      };
    }
    if ((Number(world.lineageId[idx]) | 0) !== playerLineageId) {
      return {
        eligible: false,
        founderBudget,
        founderPlaced,
        founderMaskCount,
        reason: "wrong_lineage",
      };
    }
    const x = idx % w;
    const y = (idx / w) | 0;
    if (!isTileInStartWindow(x, y, w, h, playerWindow)) {
      return {
        eligible: false,
        founderBudget,
        founderPlaced,
        founderMaskCount,
        reason: "outside_window",
      };
    }
  }

  const connected = areIndicesConnected8(founderIndices, w, h);
  return {
    eligible: connected,
    founderBudget,
    founderPlaced,
    founderMaskCount,
    reason: connected ? "ok" : "not_connected",
  };
}

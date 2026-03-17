import { RUN_PHASE } from "../contracts/ids.js";
import { getWorldPreset, isTileInStartWindow } from "./worldPresets.js";

function areFounderTilesConnected8(indices, w, h) {
  if (indices.length === 0) return false;
  const set = new Set(indices);
  const seen = new Set();
  const queue = [indices[0]];
  seen.add(indices[0]);
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % w;
    const y = (idx / w) | 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!set.has(j) || seen.has(j)) continue;
        seen.add(j);
        queue.push(j);
      }
    }
  }
  return seen.size === indices.length;
}

export function evaluateFoundationEligibility(state) {
  const founderBudget = Math.max(0, Number(state?.sim?.founderBudget || 0) | 0);
  const founderPlaced = Math.max(0, Number(state?.sim?.founderPlaced || 0) | 0);
  const phaseOk = String(state?.sim?.runPhase || "") === RUN_PHASE.GENESIS_SETUP;
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

  if (!phaseOk) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount,
      reason: "wrong_phase",
    };
  }
  if (founderBudget !== 4 || founderPlaced !== 4) {
    return {
      eligible: false,
      founderBudget,
      founderPlaced,
      founderMaskCount,
      reason: "counter_mismatch",
    };
  }
  if (founderMaskCount !== 4) {
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

  const connected = areFounderTilesConnected8(founderIndices, w, h);
  return {
    eligible: connected,
    founderBudget,
    founderPlaced,
    founderMaskCount,
    reason: connected ? "ok" : "not_connected",
  };
}

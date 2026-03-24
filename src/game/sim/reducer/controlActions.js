import { OVERLAY_MODE, WIN_MODE, WIN_MODE_SELECTABLE, isOverlayMode } from "../../contracts/ids.js";

export function buildSetWinModePatches(state, action) {
  const mode = typeof action.payload?.winMode === "string" ? action.payload.winMode : WIN_MODE.SUPREMACY;
  if (!WIN_MODE_SELECTABLE.includes(mode)) return [];
  if (Number(state?.sim?.tick || 0) > 0) return [];
  return [{ op: "set", path: "/sim/winMode", value: mode }];
}

export function buildSetOverlayPatches(action) {
  const overlay = String(action.payload || OVERLAY_MODE.NONE);
  if (!isOverlayMode(overlay)) return [];
  return [{ op: "set", path: "/meta/activeOverlay", value: overlay }];
}

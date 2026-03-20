import { clamp } from "../shared.js";
import { getWorldPreset } from "./presetCatalog.js";

export function getStartWindowRange(windowDef, w, h) {
  const x0 = Math.max(0, Math.min(w, Math.floor(Number(windowDef?.x0 || 0) * w)));
  const x1 = Math.max(0, Math.min(w, Math.ceil(Number(windowDef?.x1 || 0) * w)));
  const y0 = Math.max(0, Math.min(h, Math.floor(Number(windowDef?.y0 || 0) * h)));
  const y1 = Math.max(0, Math.min(h, Math.ceil(Number(windowDef?.y1 || 0) * h)));
  return { x0, x1, y0, y1 };
}

export function isTileInStartWindow(x, y, w, h, windowDef) {
  const range = getStartWindowRange(windowDef, w, h);
  return x >= range.x0 && x <= (range.x1 - 1) && y >= range.y0 && y <= (range.y1 - 1);
}

export function applyPresetPhysicsOverrides(basePhysics, presetId) {
  const preset = getWorldPreset(presetId);
  const src = preset.physicsOverrides || {};
  const out = { ...basePhysics };
  for (const key of Object.keys(src)) {
    const next = Number(src[key]);
    const prev = Number(out[key]);
    if (!Number.isFinite(next) || !Number.isFinite(prev)) continue;
    out[key] = clamp(prev * next, 0, 9999);
  }
  return out;
}

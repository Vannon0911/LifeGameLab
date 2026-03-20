import { clamp } from "./shared.js";
import { MAX_LIGHT_INCIDENT } from "./constants.js";

let _diffuseScratch = null;
let _diffuseScratchLen = 0;

export function diffuse(field, w, h, rate) {
  const len = field.length;
  if (!_diffuseScratch || _diffuseScratchLen < len) {
    _diffuseScratch = new Float32Array(len);
    _diffuseScratchLen = len;
  }
  const tmp = _diffuseScratch;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const idx = j * w + i;
    let sum = field[idx], cnt = 1;
    if (i > 0) { sum += field[idx - 1]; cnt++; }
    if (i < w - 1) { sum += field[idx + 1]; cnt++; }
    if (j > 0) { sum += field[idx - w]; cnt++; }
    if (j < h - 1) { sum += field[idx + w]; cnt++; }
    tmp[idx] = field[idx] * (1 - rate) + (sum / cnt) * rate;
  }
  field.set(len === _diffuseScratchLen ? tmp : tmp.subarray(0, len));
}

export function applySeasonalLightAnchor(world, phy, tick) {
  const { w, h, L } = world;
  const N = w * h;
  const seasonAmp = clamp(Number(phy.seasonAmp ?? 0.10), 0, 1);
  const seasonPeriod = Math.max(60, Number(phy.seasonPeriod || 520) | 0);
  const season = 0.5 + 0.5 * Math.sin((2 * Math.PI * tick) / seasonPeriod - Math.PI * 0.5);
  const L_target = clamp(Number(phy.L_mean || 0.22) * (1 + seasonAmp * (season - 0.5) * 2), 0.05, MAX_LIGHT_INCIDENT);
  for (let i = 0; i < N; i++) L[i] = clamp(L[i] * 0.997 + L_target * 0.003, 0, 1);
}


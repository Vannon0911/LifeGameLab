// ============================================================
// Renderer — Canvas pixel writer
// Pure: reads state, writes pixels. Never mutates state.
// ============================================================

import { OVERLAY_MODE, ZONE_ROLE } from "../contracts/ids.js";
import { FOG_HIDDEN, FOG_MEMORY, FOG_VISIBLE, applyFogToColor, getTileFogState } from "./fogOfWar.js";

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
const LOD_ZOOM_STEPS = [512, 256, 128, 64]; // requested: 512 /2 /2 /2
let _prevAliveSnapshot = null;
let _activeMoveHint = null;

// Color string cache to avoid repeated string interpolation in hot rendering loops
const _colorCache = new Map();
const _COLOR_CACHE_MAX = 4096;

function rgbaStr(r, g, b, a) {
  const key = (r << 24 | g << 16 | b << 8 | ((a * 100) | 0)) | 0;
  let s = _colorCache.get(key);
  if (s !== undefined) return s;
  s = `rgba(${r}, ${g}, ${b}, ${a})`;
  if (_colorCache.size >= _COLOR_CACHE_MAX) _colorCache.clear();
  _colorCache.set(key, s);
  return s;
}

function rgbStr(r, g, b) {
  const key = (r << 16 | g << 8 | b) | 0;
  let s = _colorCache.get(key | 0x1000000);
  if (s !== undefined) return s;
  s = `rgb(${r}, ${g}, ${b})`;
  if (_colorCache.size >= _COLOR_CACHE_MAX) _colorCache.clear();
  _colorCache.set(key | 0x1000000, s);
  return s;
}

function computeLodFromZoom(tilePx) {
  // Virtual zoom metric so LOD is device-independent and stable over grid growth.
  const zoom = Math.max(1, tilePx * 32);
  if (zoom >= LOD_ZOOM_STEPS[0]) return { level: 0, zoom, target: LOD_ZOOM_STEPS[0], name: "LOD0" };
  if (zoom >= LOD_ZOOM_STEPS[1]) return { level: 1, zoom, target: LOD_ZOOM_STEPS[1], name: "LOD1" };
  if (zoom >= LOD_ZOOM_STEPS[2]) return { level: 2, zoom, target: LOD_ZOOM_STEPS[2], name: "LOD2" };
  return { level: 3, zoom, target: LOD_ZOOM_STEPS[3], name: "LOD3" };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

let _prevAliveBuffer = null;
let _prevAliveW = 0;
let _prevAliveH = 0;

function computeSingleMoveHint(world, alpha = 1) {
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  const alive = world?.alive;
  if (!alive || !ArrayBuffer.isView(alive)) return null;
  const total = w * h;
  if (total <= 0 || alive.length !== total) return null;

  const prev = _prevAliveBuffer;
  const prevW = _prevAliveW;
  const prevH = _prevAliveH;

  if (!prev || prevW !== w || prevH !== h || prev.length !== total) {
    _prevAliveBuffer = new Uint8Array(alive);
    _prevAliveW = w;
    _prevAliveH = h;
    _activeMoveHint = null;
    return null;
  }

  // Diff previous and current alive arrays directly without building index sets
  let removedIdx = -1, addedIdx = -1;
  let removedCount = 0, addedCount = 0;
  for (let i = 0; i < total; i++) {
    const p = prev[i];
    const c = alive[i];
    if (p === c) continue;
    if (p === 1 && c !== 1) { removedIdx = i; removedCount++; }
    else if (p !== 1 && c === 1) { addedIdx = i; addedCount++; }
    if (removedCount > 1 || addedCount > 1) break;
  }

  // Update snapshot
  _prevAliveBuffer.set(alive);

  if (removedCount === 1 && addedCount === 1) {
    _activeMoveHint = { from: removedIdx, to: addedIdx };
  }
  if (_activeMoveHint && alpha < 1) return _activeMoveHint;
  if (alpha >= 1) _activeMoveHint = null;
  return null;
}

function mutationIntensityFromTrait(trait, idx) {
  if (!trait || (typeof trait.length !== "number")) return 0;
  const o = idx * 7;
  const base = [1.00, 0.11, 0.10, 0.14, 0.90, 0.60, 0.50];
  let acc = 0;
  for (let k = 0; k < 7; k++) {
    const v = Number(trait[o + k] ?? base[k]);
    acc += Math.abs(v - base[k]);
  }
  return clamp01(acc / 2.6);
}

function getPlayerVisualState(world, meta, sim) {
  const playerLineageId = Number(meta?.playerLineageId || 0);
  const memory = world?.lineageMemory?.[playerLineageId] || {};
  const doctrine = String(memory.doctrine || "equilibrium");
  const synergies = Array.isArray(memory.synergies) ? memory.synergies : [];
  return {
    doctrine,
    synergies: synergies.length,
    stage: Number(sim?.playerStage || 1),
  };
}

function getDoctrinePalette(doctrine, synergies = 0) {
  const palettes = {
    expansion: { hue: 152, glow: [98, 255, 184], link: [88, 255, 178] },
    reserve: { hue: 42, glow: [255, 206, 116], link: [255, 196, 106] },
    network: { hue: 192, glow: [118, 226, 255], link: [104, 216, 255] },
    detox: { hue: 104, glow: [174, 246, 134], link: [132, 235, 164] },
    equilibrium: { hue: 168, glow: [112, 228, 206], link: [102, 212, 212] },
  };
  const base = palettes[doctrine] || palettes.equilibrium;
  const bonus = clamp01(synergies / 4);
  return {
    hue: base.hue,
    glow: base.glow,
    link: base.link,
    bonus,
  };
}

function toRgbTriplet(r, g, b) {
  return [
    Math.round(clamp(r, 0, 255)),
    Math.round(clamp(g, 0, 255)),
    Math.round(clamp(b, 0, 255)),
  ];
}

function computeConflictSignal(actionMap, idx, meta) {
  const raw = Number(actionMap?.[idx] || 0);
  if (raw <= 0) return { raw: 0, visible: 0, remote: false, defense: false };
  const remote = raw >= 240;
  const defense = raw >= 200 && raw < 240;
  const showRemote = !!meta?.ui?.showRemoteAttackOverlay;
  const showDefense = !!meta?.ui?.showDefenseOverlay;
  if (remote && !showRemote) return { raw, visible: 0, remote, defense };
  if (defense && !showDefense) return { raw, visible: 0, remote, defense };
  return { raw, visible: clamp01(raw / 255), remote, defense };
}

function computeRenderModeFieldColor(world, meta, idx) {
  const mode = meta?.renderMode || "combined";
  const lv = clamp01(world?.L?.[idx] ?? 0);
  const rv = clamp01(world?.R?.[idx] ?? 0);
  const wv = clamp01(world?.W?.[idx] ?? 0);
  const water = clamp01(world?.water?.[idx] ?? 0);
  const sv = clamp01(world?.Sat?.[idx] ?? 0);
  const pv = clamp01(world?.P?.[idx] ?? 0);
  const biome = Number(world?.biomeId?.[idx] ?? 0);
  let r = 0;
  let g = 0;
  let b = 0;

  if (mode === "light") {
    const lum = 14 + lv * 220;
    r = lum; g = lum; b = lum;
  } else if (mode === "energy") {
    r = wv * 40; g = rv * 60; b = lv * 80;
  } else if (mode === "fields") {
    r = 18 + wv * 180 + sv * 90 - water * 18;
    g = 14 + rv * 170 + pv * 110 + water * 36 - wv * 36;
    b = 16 + lv * 70 + pv * 64 + water * 132 + (1 - sv) * 24;
  } else if (mode === "diagnostic") {
    r = 10 + wv * 170 + sv * 72 + (1 - lv) * 52;
    g = 10 + rv * 150 + pv * 92;
    b = 10 + lv * 140;
  } else if (mode === "cells") {
    r = 0; g = 0; b = 0;
  } else {
    const nutrientGlow = clamp01(rv * 0.90 + pv * 0.35);
    const lightLift = clamp01(lv * 0.85);
    const toxinHeat = clamp01(wv * 0.70);
    const waterGloss = clamp01(water * 0.95);
    const saturationMist = clamp01(sv * 0.55);
    const biomeTint = biome === 2 ? [10, 24, 10]
      : biome === 3 ? [18, 10, -4]
      : biome === 4 ? [24, 0, -12]
      : biome === 1 ? [4, 14, 18]
      : [10, 6, 2];
    r = 8 + lightLift * 10 + nutrientGlow * 10 + saturationMist * 8 + toxinHeat * 44 + waterGloss * 12 + biomeTint[0];
    g = 14 + lightLift * 30 + nutrientGlow * 86 + saturationMist * 14 + toxinHeat * 20 + waterGloss * 22 + biomeTint[1];
    b = 18 + lightLift * 44 + nutrientGlow * 28 + (1 - saturationMist) * 18 + toxinHeat * 8 + waterGloss * 86 + biomeTint[2];
    if (toxinHeat > 0.02) {
      r += toxinHeat * 28;
      g -= toxinHeat * 6;
      b -= toxinHeat * 4;
    }
    if (waterGloss > 0.08) {
      b += waterGloss * 28;
      g += waterGloss * 10;
    }
  }

  return toRgbTriplet(r, g, b);
}

function computeOverlayFieldColor(world, meta, idx, overlay) {
  const lv = clamp01(world?.L?.[idx] ?? 0);
  const rv = clamp01(world?.R?.[idx] ?? 0);
  const wv = clamp01(world?.W?.[idx] ?? 0);
  const sv = clamp01(world?.Sat?.[idx] ?? 0);
  const pv = clamp01(world?.P?.[idx] ?? 0);
  const ev = clamp01((world?.E?.[idx] ?? 0) / Math.max(0.0001, Number(meta?.physics?.Emax || 3.2)));
  const reserve = clamp01(world?.reserve?.[idx] ?? 0);
  const link = clamp01(world?.link?.[idx] ?? 0);
  const cluster = clamp01(world?.clusterField?.[idx] ?? 0);
  const alive = world?.alive?.[idx] === 1;
  const lineageId = Number(world?.lineageId?.[idx] || 0);
  const playerLineageId = Number(meta?.playerLineageId || 1);
  const cpuLineageId = Number(meta?.cpuLineageId || 2);

  if (overlay === OVERLAY_MODE.ENERGY) {
    const reserveRisk = clamp01((0.12 - reserve) / 0.12);
    const charge = clamp01(ev * 0.7 + reserve * 0.3);
    return toRgbTriplet(
      14 + reserveRisk * 168 + wv * 42,
      20 + charge * 156 + reserve * 32,
      28 + reserve * 126 + lv * 58
    );
  }

  if (overlay === OVERLAY_MODE.TOXIN) {
    const detoxTint = clamp01((1 - wv) * 0.35 + reserve * 0.15);
    return toRgbTriplet(
      18 + wv * 224,
      12 + detoxTint * 76 + sv * 18,
      16 + detoxTint * 38
    );
  }

  if (overlay === OVERLAY_MODE.NUTRIENT) {
    const growth = clamp01(rv * 0.78 + pv * 0.45);
    return toRgbTriplet(
      18 + growth * 112 + lv * 18,
      28 + growth * 182,
      18 + rv * 38 + pv * 28
    );
  }

  if (overlay === OVERLAY_MODE.TERRITORY) {
    if (!alive) {
      return toRgbTriplet(
        10 + rv * 20,
        14 + rv * 32 + lv * 8,
        18 + lv * 30
      );
    }
    if (lineageId === playerLineageId) {
      return toRgbTriplet(
        18 + cluster * 38,
        66 + link * 104 + cluster * 28,
        82 + cluster * 132
      );
    }
    if (lineageId === cpuLineageId) {
      return toRgbTriplet(
        86 + cluster * 128,
        22 + link * 32,
        44 + cluster * 66
      );
    }
    return toRgbTriplet(
      72 + cluster * 46,
      58 + link * 42,
      36 + cluster * 30
    );
  }

  if (overlay === OVERLAY_MODE.CONFLICT) {
    const signal = computeConflictSignal(world?.actionMap, idx, meta);
    if (signal.visible <= 0) {
      return toRgbTriplet(
        10 + wv * 26,
        10 + rv * 18,
        14 + lv * 28
      );
    }
    if (signal.remote) {
      return toRgbTriplet(
        102 + signal.visible * 136,
        24 + signal.visible * 16,
        84 + signal.visible * 108
      );
    }
    if (signal.defense) {
      return toRgbTriplet(
        24 + signal.visible * 42,
        92 + signal.visible * 82,
        118 + signal.visible * 112
      );
    }
    return toRgbTriplet(
      72 + signal.visible * 172,
      44 + signal.visible * 92,
      18 + signal.visible * 34
    );
  }

  return computeRenderModeFieldColor(world, meta, idx);
}

export function computeFieldSurfaceColor(world, meta, idx) {
  const overlay = String(meta?.activeOverlay || OVERLAY_MODE.NONE);
  const color = overlay !== OVERLAY_MODE.NONE
    ? computeOverlayFieldColor(world, meta, idx, overlay)
    : computeRenderModeFieldColor(world, meta, idx);
  return applyFogToColor(color, getTileFogState(world, idx));
}

function hasStable2x2(world, x, y) {
  const { w, h, alive } = world;
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return false;
  const i = y * w + x;
  return alive[i] === 1 && alive[i + 1] === 1 && alive[i + w] === 1 && alive[i + w + 1] === 1;
}

function drawRoundCells(ctx, world, offX, offY, tilePx, meta, sim, quality = 3, motionHint = null, alpha = 1) {
  const { w, h, alive, E, hue, trait, clusterField, superId, lineageId } = world;
  const Emax = Number(meta?.physics?.Emax) || 3.2;
  const cpuLineageId = Number(meta?.cpuLineageId || 2) | 0;
  if (quality <= 0) return;
  const cellCount = Math.max(1, w * h);
  const isHeavyGrid = cellCount >= 96 * 96;
  const isHugeGrid = cellCount >= 120 * 120;
  const detailBoost = clamp01((6400 - cellCount) / 4200);
  const skip = 1;
  const visual = getPlayerVisualState(world, meta, sim);
  const doctrinePalette = getDoctrinePalette(visual.doctrine, visual.synergies);
  const allowModules = !isHeavyGrid && tilePx >= 4 && quality >= 2;
  const moduleMask = allowModules ? new Uint8Array(w * h) : null;
  ctx.save();

  // Keep cell placement exact even on tiny tiles.
  if (tilePx < 3) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (alive[i] !== 1) continue;
        const fogState = getTileFogState(world, i);
        const lid = Number(lineageId?.[i] || 0) | 0;
        if (fogState === FOG_HIDDEN) continue;
        if (fogState === FOG_MEMORY) {
          if (lid !== cpuLineageId) continue;
          ctx.fillStyle = "rgba(196, 124, 112, 0.52)";
          const px = offX + x * tilePx;
          const py = offY + y * tilePx;
          ctx.fillRect(px, py, Math.max(1, tilePx), Math.max(1, tilePx));
          continue;
        }
        const ev = clamp01((Number(E[i]) || 0) / Emax);
        const h0 = Number(hue[i]) || 0;
        const c = hslToRgb(h0, 38 + ev * 40, 46 + ev * 16);
        ctx.fillStyle = rgbaStr(Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 0.96);
        const px = offX + x * tilePx;
        const py = offY + y * tilePx;
        ctx.fillRect(px, py, Math.max(1, tilePx), Math.max(1, tilePx));
      }
    }
    ctx.restore();
    return;
  }

  if (allowModules) {
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        if (!hasStable2x2(world, x, y)) continue;
        const i = y * w + x;
        if (getTileFogState(world, i) !== FOG_VISIBLE
          || getTileFogState(world, i + 1) !== FOG_VISIBLE
          || getTileFogState(world, i + w) !== FOG_VISIBLE
          || getTileFogState(world, i + w + 1) !== FOG_VISIBLE) continue;
        if (moduleMask[i]) continue;
        moduleMask[i] = moduleMask[i + 1] = moduleMask[i + w] = moduleMask[i + w + 1] = 1;
        const ev = (
          (Number(E[i]) || 0) +
          (Number(E[i + 1]) || 0) +
          (Number(E[i + w]) || 0) +
          (Number(E[i + w + 1]) || 0)
        ) / (4 * Emax);
        const cv = (
          (Number(clusterField?.[i]) || 0) +
          (Number(clusterField?.[i + 1]) || 0) +
          (Number(clusterField?.[i + w]) || 0) +
          (Number(clusterField?.[i + w + 1]) || 0)
        ) / 4;
        const px = offX + x * tilePx;
        const py = offY + y * tilePx;
        const size = tilePx * 2;
        const radius = Math.max(3, tilePx * 0.58);
        const glowAlpha = 0.09 + ev * 0.12 + doctrinePalette.bonus * 0.10;
        const shellAlpha = 0.18 + cv * 0.18 + doctrinePalette.bonus * 0.10;
        ctx.fillStyle = `rgba(${doctrinePalette.glow[0]}, ${doctrinePalette.glow[1]}, ${doctrinePalette.glow[2]}, ${glowAlpha})`;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(px + tilePx * 0.06, py + tilePx * 0.06, size - tilePx * 0.12, size - tilePx * 0.12, radius);
          ctx.fill();
        } else {
          ctx.fillRect(px, py, size, size);
        }
        ctx.strokeStyle = `rgba(235, 255, 248, ${shellAlpha})`;
        ctx.lineWidth = Math.max(1, tilePx * 0.12);
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(px + tilePx * 0.12, py + tilePx * 0.12, size - tilePx * 0.24, size - tilePx * 0.24, radius * 0.9);
          ctx.stroke();
        } else {
          ctx.strokeRect(px, py, size, size);
        }
        const cx = px + size * 0.5;
        const cy = py + size * 0.5;
        const core = ctx.createRadialGradient(cx, cy, tilePx * 0.12, cx, cy, tilePx * 0.95);
        core.addColorStop(0, `rgba(255,255,255,${0.18 + ev * 0.20})`);
        core.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, tilePx * 0.95, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  for (let y = 0; y < h; y += skip) {
    for (let x = 0; x < w; x += skip) {
      const i = y * w + x;
      if (alive[i] !== 1) continue;
      const fogState = getTileFogState(world, i);
      const lid = Number(lineageId?.[i] || 0) | 0;
      if (fogState === FOG_HIDDEN) continue;
      let visualX = x;
      let visualY = y;
      if (motionHint && i === motionHint.to) {
        const fromX = motionHint.from % w;
        const fromY = (motionHint.from / w) | 0;
        visualX = fromX + (x - fromX) * alpha;
        visualY = fromY + (y - fromY) * alpha;
      }
      const cx = offX + visualX * tilePx + tilePx * 0.5;
      const cy = offY + visualY * tilePx + tilePx * 0.5;
      const ev = clamp01((Number(E[i]) || 0) / Emax);
      const mut = mutationIntensityFromTrait(trait, i);
      const cv = clamp01(clusterField?.[i] ?? 0);
      const inSuper = (superId?.[i] ?? -1) >= 0;
      const inModule = moduleMask ? moduleMask[i] === 1 : false;
      const radius = Math.max(1, tilePx * (inModule ? 0.26 : isHugeGrid ? 0.34 : 0.36 + ev * 0.10));
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(radius)) continue;
      if (fogState === FOG_MEMORY) {
        if (lid !== cpuLineageId) continue;
        ctx.fillStyle = "rgba(196, 124, 112, 0.28)";
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1.2, radius * 0.58), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(228, 176, 152, 0.32)";
        ctx.lineWidth = Math.max(0.5, radius * 0.10);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1.8, radius * 0.92), 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      const h0 = Number(hue[i]) || 0;
      const doctrineBlend = inModule ? 0.52 : 0.18 + doctrinePalette.bonus * 0.20;
      const sat = isHugeGrid ? 42 + mut * 36 : 22 + mut * 64 + doctrinePalette.bonus * 8;
      const litCore = isHugeGrid ? 58 + ev * 14 : 42 + ev * 26 + mut * 12 + doctrinePalette.bonus * 6;
      const litRim = isHugeGrid ? 38 + ev * 10 : 26 + ev * 14;
      const coreHue = h0 * (1 - doctrineBlend) + doctrinePalette.hue * doctrineBlend + mut * 12;
      const core = hslToRgb(coreHue, sat, litCore);
      const rim = hslToRgb(h0 - 12, Math.max(25, sat - 20), litRim);
      if (isHugeGrid) {
        const side = Math.max(1.4, tilePx * 0.68);
        ctx.fillStyle = rgbaStr(Math.round(core[0]), Math.round(core[1]), Math.round(core[2]), 0.96);
        ctx.fillRect(cx - side * 0.5, cy - side * 0.5, side, side);
        if (quality >= 1 && tilePx >= 2) {
          ctx.strokeStyle = "rgba(10,16,22,0.55)";
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - side * 0.5 + 0.5, cy - side * 0.5 + 0.5, Math.max(1, side - 1), Math.max(1, side - 1));
        }
      } else {
        const g = ctx.createRadialGradient(cx - radius * 0.28, cy - radius * 0.28, radius * 0.08, cx, cy, radius);
        g.addColorStop(0, `rgba(${Math.round(core[0])}, ${Math.round(core[1])}, ${Math.round(core[2])}, 0.96)`);
        g.addColorStop(0.72, `rgba(${Math.round(rim[0])}, ${Math.round(rim[1])}, ${Math.round(rim[2])}, 0.90)`);
        g.addColorStop(1, `rgba(${Math.round(rim[0] * 0.78)}, ${Math.round(rim[1] * 0.78)}, ${Math.round(rim[2] * 0.78)}, 0.82)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        if (quality >= 1 && tilePx >= 3) {
          ctx.strokeStyle = "rgba(8,14,20,0.52)";
          ctx.lineWidth = Math.max(0.8, radius * 0.13);
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.98, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (!isHeavyGrid && quality >= 2 && cv > 0.5) {
        ctx.strokeStyle = `rgba(${doctrinePalette.link[0]}, ${doctrinePalette.link[1]}, ${doctrinePalette.link[2]}, ${0.05 + cv * 0.11})`;
        ctx.lineWidth = Math.max(0.6, radius * 0.09);
        ctx.beginPath();
        ctx.arc(cx, cy, radius * (1.20 + cv * 0.10), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!isHugeGrid && quality >= 2 && inSuper) {
        ctx.strokeStyle = `rgba(255, 225, 130, ${0.12 + ev * 0.18})`;
        ctx.lineWidth = Math.max(0.8, radius * 0.13);
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.36, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (!isHeavyGrid && quality >= 2 && detailBoost > 0.22 && tilePx >= 4 && !inModule) {
        ctx.fillStyle = `rgba(255,255,255,${(0.10 + ev * 0.15 + mut * 0.12) * detailBoost})`;
        ctx.beginPath();
        ctx.arc(cx - radius * 0.30, cy - radius * 0.32, Math.max(0.8, radius * 0.24), 0, Math.PI * 2);
        ctx.fill();
      }
      if (!isHeavyGrid && quality >= 3 && detailBoost > 0.45 && tilePx >= 5) {
        ctx.strokeStyle = `rgba(${Math.round(core[0])}, ${Math.round(core[1])}, ${Math.round(core[2])}, ${0.12 + detailBoost * 0.18})`;
        ctx.lineWidth = Math.max(0.6, radius * 0.11);
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// Draw tactical grid lines so tile boundaries stay legible on mobile + dense maps.
function drawGrid(ctx, offX, offY, imageW, imageH, tilePx, lodLevel = 0, detailMode = "auto") {
  if (detailMode === "minimal") return;
  // Keep grid visible at common play zooms; only suppress at the coarsest LOD.
  if (lodLevel > 2) return;
  // On dense grids show a lightweight macro-grid, so raster remains readable.
  if (tilePx < 18) {
    if (tilePx < 3) return;
    ctx.save();
    const focused = detailMode === "focused";
    const minorEvery = focused ? 1 : (tilePx >= 10 ? 1 : 2);
    const majorEvery = tilePx >= 8 ? 8 : 12;
    ctx.lineWidth = 1;
    ctx.strokeStyle = tilePx >= 10
      ? (focused ? "rgba(198,224,255,0.22)" : "rgba(198,224,255,0.26)")
      : (focused ? "rgba(198,224,255,0.15)" : "rgba(198,224,255,0.18)");
    for (let x = offX, c = 0; x <= offX + imageW; x += tilePx, c++) {
      if (c % minorEvery !== 0) continue;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, offY);
      ctx.lineTo(x + 0.5, offY + imageH);
      ctx.stroke();
    }
    for (let y = offY, c = 0; y <= offY + imageH; y += tilePx, c++) {
      if (c % minorEvery !== 0) continue;
      ctx.beginPath();
      ctx.moveTo(offX, y + 0.5);
      ctx.lineTo(offX + imageW, y + 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = focused ? "rgba(255,205,132,0.28)" : "rgba(255,205,132,0.34)";
    for (let x = offX, c = 0; x <= offX + imageW; x += tilePx, c++) {
      if (c % majorEvery !== 0) continue;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, offY);
      ctx.lineTo(x + 0.5, offY + imageH);
      ctx.stroke();
    }
    for (let y = offY, c = 0; y <= offY + imageH; y += tilePx, c++) {
      if (c % majorEvery !== 0) continue;
      ctx.beginPath();
      ctx.moveTo(offX, y + 0.5);
      ctx.lineTo(offX + imageW, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.save();
  const focused = detailMode === "focused";
  const small = tilePx < 22;
  const minorStep = focused ? 1 : 1;
  const minorAlpha = focused ? (small ? 0.03 : 0.05) : (small ? 0.04 : 0.06);
  const majorEvery = 10;
  ctx.strokeStyle = `rgba(188,255,231,${minorAlpha})`;
  ctx.lineWidth = 1;
  for (let x = offX; x <= offX + imageW; x += tilePx * minorStep) {
    ctx.beginPath(); ctx.moveTo(x+0.5, offY); ctx.lineTo(x+0.5, offY+imageH); ctx.stroke();
  }
  for (let y = offY; y <= offY + imageH; y += tilePx * minorStep) {
    ctx.beginPath(); ctx.moveTo(offX, y+0.5); ctx.lineTo(offX+imageW, y+0.5); ctx.stroke();
  }
  if (tilePx >= 3 && lodLevel <= 2) {
    ctx.strokeStyle = "rgba(255,205,132,0.20)";
    ctx.lineWidth = 1;
    for (let x = offX, c = 0; x <= offX + imageW; x += tilePx, c++) {
      if (c % majorEvery !== 0) continue;
      ctx.beginPath(); ctx.moveTo(x + 0.5, offY); ctx.lineTo(x + 0.5, offY + imageH); ctx.stroke();
    }
    for (let y = offY, c = 0; y <= offY + imageH; y += tilePx, c++) {
      if (c % majorEvery !== 0) continue;
      ctx.beginPath(); ctx.moveTo(offX, y + 0.5); ctx.lineTo(offX + imageW, y + 0.5); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFieldSurface(ctx, world, meta, offX, offY, tilePx, quality = 3) {
  const { w, h, L, R, P, W, Sat } = world;
  const overlayActive = String(meta?.activeOverlay || OVERLAY_MODE.NONE) !== OVERLAY_MODE.NONE;
  const detail = !overlayActive && quality >= 2 && tilePx >= 5;
  const step = tilePx < 3 ? 2 : 1;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = y * w + x;
      const [r, g, b] = computeFieldSurfaceColor(world, meta, i);
      const lv = clamp01(L?.[i] ?? 0);
      const rv = clamp01(R?.[i] ?? 0);
      const pv = clamp01(P?.[i] ?? 0);
      const wv = clamp01(W?.[i] ?? 0);
      const sv = clamp01(Sat?.[i] ?? 0);

      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      const size = tilePx * step;
      ctx.fillStyle = rgbStr(Math.round(r), Math.round(g), Math.round(b));
      ctx.fillRect(px, py, size, size);

      if (detail) {
        const shade = clamp01((1 - lv) * 0.34 + wv * 0.14 + sv * 0.10);
        const glow = clamp01(lv * 0.48 + rv * 0.28 + pv * 0.16 - wv * 0.08);
        if (shade > 0.05) {
          ctx.fillStyle = `rgba(3,8,10,${0.05 + shade * 0.10})`;
          ctx.fillRect(px, py, size, size);
        }
        if (glow > 0.06) {
          const gx = px + size * 0.25;
          const gy = py + size * 0.2;
          const grad = ctx.createRadialGradient(gx, gy, size * 0.08, gx, gy, size * 0.72);
          grad.addColorStop(0, `rgba(132,232,214,${0.05 + glow * 0.16})`);
          grad.addColorStop(1, "rgba(176,255,220,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(px, py, size, size);
        }
      }
    }
  }
}

function drawResourceMarkers(ctx, world, offX, offY, tilePx) {
  const R = world?.R;
  if (!R || !ArrayBuffer.isView(R) || tilePx < 3) return;
  const { w, h } = world;
  const every = tilePx < 6 ? 2 : 1;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(9, Math.floor(tilePx * 0.65))}px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif`;
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const idx = y * w + x;
      const fogState = getTileFogState(world, idx);
      if (fogState === FOG_HIDDEN) continue;
      const rv = clamp01(Number(R[idx] || 0));
      if (rv < 0.05) continue;
      const glyph = rv >= 0.7 ? "🌳" : rv >= 0.35 ? "🌿" : "🌱";
      const cx = offX + x * tilePx + tilePx * 0.5;
      const cy = offY + y * tilePx + tilePx * 0.5;
      if (fogState === FOG_MEMORY) ctx.globalAlpha = 0.4;
      else ctx.globalAlpha = 1.0;
      ctx.fillText(glyph, cx, cy);
      ctx.globalAlpha = 1.0;
    }
  }
  ctx.restore();
}

function drawHarvestProgress(ctx, world, sim, offX, offY, tilePx) {
  const activeOrder = sim?.activeOrder;
  if (!activeOrder || !activeOrder.active || String(activeOrder.type || "") !== "HARVEST") return;
  const maxProgress = Math.max(1, Number(activeOrder.maxProgress || 1));
  const progress = Math.max(0, Math.min(maxProgress, Number(activeOrder.progress || 0)));
  if (progress <= 0) return;
  const ratio = progress / maxProgress;
  const targetX = Number(activeOrder.targetX ?? -1) | 0;
  const targetY = Number(activeOrder.targetY ?? -1) | 0;
  const w = Number(world?.w || 0) | 0;
  const h = Number(world?.h || 0) | 0;
  if (targetX < 0 || targetY < 0 || targetX >= w || targetY >= h) return;
  const idx = targetY * w + targetX;
  if (getTileFogState(world, idx) === FOG_HIDDEN) return;

  const cx = offX + targetX * tilePx + tilePx * 0.5;
  const cy = offY + targetY * tilePx + tilePx * 0.5;
  const radius = Math.max(2, tilePx * 0.34);
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + ratio * Math.PI * 2;
  ctx.save();
  ctx.strokeStyle = "rgba(100, 220, 100, 0.85)";
  ctx.lineWidth = Math.max(1, tilePx * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.stroke();
  ctx.restore();
}
function drawTileObjectPlaceholders(ctx, world, offX, offY, tilePx) {
  if (tilePx < 8) return;
  const { w, h, zoneRole, founderMask, R } = world;
  if (w <= 0 || h <= 0) return;
  const step = tilePx < 12 ? 2 : 1;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.max(9, Math.floor(tilePx * 0.68))}px "Segoe UI Emoji","Noto Color Emoji","Apple Color Emoji",sans-serif`;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = y * w + x;
      const role = Number(zoneRole?.[i] || 0) | 0;
      const founder = (Number(founderMask?.[i] || 0) | 0) === 1;
      const resource = clamp01(R?.[i] || 0);
      let glyph = "";
      if (role === ZONE_ROLE.CORE) glyph = "🏠";
      else if (role === ZONE_ROLE.DNA) glyph = "🧬";
      else if (role === ZONE_ROLE.INFRA) glyph = "🔌";
      else if (founder) glyph = "🧱";
      else if (resource > 0.86) glyph = "⛏️";
      if (!glyph) continue;
      const fog = getTileFogState(world, i);
      if (fog === FOG_HIDDEN) continue;
      ctx.globalAlpha = fog === FOG_MEMORY ? 0.32 : 0.74;
      const cx = offX + x * tilePx + tilePx * 0.5;
      const cy = offY + y * tilePx + tilePx * 0.5;
      ctx.fillText(glyph, cx, cy);
    }
  }
  ctx.restore();
}

export function render(canvas, state, perf = null) {
  const { world, meta, sim } = state;
  if (!world) return null;

  const quality = clamp((perf?.quality ?? 3) | 0, 0, 3);
  const dprCap = Number.isFinite(perf?.dprCap) ? perf.dprCap : 2;
  const dpr  = perf?.dpr || (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  const finalDpr = Math.min(dpr, dprCap);

  const rect = canvas.getBoundingClientRect();
  const CW   = Math.floor(rect.width  * finalDpr);
  const CH   = Math.floor(rect.height * finalDpr);
  if (canvas.width !== CW || canvas.height !== CH) {
    canvas.width = CW; canvas.height = CH;
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  return drawFrame(ctx, state, { ...perf, quality, dpr: finalDpr, CW, CH });
}

/**
 * Modular drawing function — can be used with any 2D context (Main or Offscreen).
 * No direct window or document dependencies.
 */
export function drawFrame(ctx, state, perf = {}) {
  const { world, meta } = state;
  const { w, h } = world;
  const quality = clamp((perf?.quality ?? 3) | 0, 0, 3);
  const alpha = clamp01(Number.isFinite(perf?.alpha) ? perf.alpha : 1);
  const detailMode = String(meta?.ui?.renderDetailMode || "auto");
  const userFocused = detailMode === "focused";
  const userMinimal = detailMode === "minimal";
  const CW = Number.isFinite(perf?.CW) && perf.CW > 0 ? perf.CW : Math.max(1, Number(ctx?.canvas?.width || 1));
  const CH = Number.isFinite(perf?.CH) && perf.CH > 0 ? perf.CH : Math.max(1, Number(ctx?.canvas?.height || 1));
  const cells = w * h;

  const tilePx = Math.max(1, Math.floor(Math.min(CW / w, CH / h)));
  const lod = computeLodFromZoom(tilePx);
  const imageW = w * tilePx;
  const imageH = h * tilePx;
  const offX   = Math.floor((CW - imageW) / 2);
  const offY   = Math.floor((CH - imageH) / 2);
  const isHeavyGrid = cells >= 96 * 96;
  const isHugeGrid = cells >= 120 * 120;
  const tactical = userMinimal || quality <= 1 || isHugeGrid;
  const balanced = !userFocused && (quality === 2 || isHeavyGrid);
  const overlayActive = String(meta?.activeOverlay || OVERLAY_MODE.NONE) !== OVERLAY_MODE.NONE;

  // Composite to main canvas
  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, 0, CW, CH);
  
  // Always use full surface render to keep visible macro-patterns and avoid pixel-brei.
  ctx.imageSmoothingEnabled = false;
  drawFieldSurface(ctx, world, meta, offX, offY, tilePx, quality);

  // Minimal tactical presentation: grid + units + structures + resources + fog.
  if (!overlayActive && quality >= 1) drawResourceMarkers(ctx, world, offX, offY, tilePx);
  const moveHint = computeSingleMoveHint(world, alpha);
  drawRoundCells(ctx, world, offX, offY, tilePx, meta, null, quality, moveHint, alpha);
  if (!overlayActive && quality >= 1) drawTileObjectPlaceholders(ctx, world, offX, offY, tilePx);
  if (quality >= 1) drawGrid(ctx, offX, offY, imageW, imageH, tilePx, lod.level, detailMode);
  drawHarvestProgress(ctx, world, state.sim, offX, offY, tilePx);

  return { tilePx, offX, offY, dpr: perf.dpr, quality, lod };
}

// Convert screen coords to world coords
export function screenToWorld(screenX, screenY, renderInfo, meta) {
  if (!renderInfo) return null;
  const { tilePx, offX, offY, dpr } = renderInfo;
  const wx = Math.floor((screenX * dpr - offX) / tilePx);
  const wy = Math.floor((screenY * dpr - offY) / tilePx);
  if (wx < 0 || wy < 0 || wx >= meta.gridW || wy >= meta.gridH) return null;
  return { x: wx, y: wy };
}




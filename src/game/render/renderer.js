// ============================================================
// Renderer — Canvas pixel writer
// Pure: reads state, writes pixels. Never mutates state.
// ============================================================

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
const LOD_ZOOM_STEPS = [512, 256, 128, 64]; // requested: 512 /2 /2 /2

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

// Background/tile pass (without direct cell colour)
function writeBackgroundPixels(data, world, meta, w, h) {
  const { alive, E, L, R, W, Sat, P, link, clusterField, superId } = world;
  const Emax  = meta.physics.Emax || 3.2;
  const mode  = meta.renderMode || "combined";

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const base = idx * 4;

      const a  = alive[idx] === 1;
      const lv = clamp01(L[idx]);
      const ev = clamp01(E[idx] / Emax);
      const rv = clamp01(R[idx]);
      const wv = clamp01(W[idx]);
      const svf = clamp01(Sat?.[idx] ?? 0);
      const pv = clamp01(P?.[idx] ?? 0);
      const lk = clamp01(link[idx]);
      const cv = clamp01(clusterField?.[idx] ?? 0);
      const sv = (superId?.[idx] ?? -1) >= 0 ? 1 : 0;

      let r = 0, g = 0, b = 0, alpha = 255;

      if (mode === "light") {
        // Grayscale light reflection field
        const lum = Math.round(14 + lv * 220);
        r = lum; g = lum; b = lum;

      } else if (mode === "energy") {
        // Energy density
        r = wv * 40; g = rv * 60; b = lv * 80;

      } else if (mode === "fields") {
        // Field map: nutrients (green), toxins (red), saturation (amber)
        r = 18 + wv * 180 + svf * 90;
        g = 14 + rv * 170 + pv * 110 - wv * 36;
        b = 16 + lv * 70 + pv * 64 + (1 - svf) * 24;
      } else if (mode === "diagnostic") {
        // Dense all-signal field: every channel leaves a visible footprint.
        r = 10 + wv * 170 + svf * 72 + (1 - lv) * 52;
        g = 10 + rv * 150 + pv * 92 + lk * 28;
        b = 10 + lv * 140 + cv * 56 + sv * 36;

      } else if (mode === "cells") {
        // Cells only, black bg
        r = 0; g = 0; b = 0;

      } else {
        // "combined" — requested mapping:
        // Saturation field: black (0) -> green (1)
        // Light field: blue -> yellow gradient
        const satMap = [0, svf * 228, 0];
        const lightMap = [
          34 + lv * 221,
          88 + lv * 154,
          255 - lv * 180,
        ];
        const toxDark = clamp01(wv * 0.55);
        // Keep black at saturation=0, then tint toward blue/yellow by light.
        const lightTint = svf * 0.46;
        r = satMap[0] + lightMap[0] * lightTint;
        g = satMap[1] + lightMap[1] * lightTint;
        b = satMap[2] + lightMap[2] * lightTint;
        // Toxins darken tiles slightly, but do not change the base mapping.
        r *= 1 - toxDark * 0.24;
        g *= 1 - toxDark * 0.24;
        b *= 1 - toxDark * 0.24;
      }

      data[base]   = r;
      data[base+1] = g;
      data[base+2] = b;
      data[base+3] = alpha;
    }
  }
}

// Cell colour pass (separate layer with alpha)
function writeCellColorPixels(data, world, meta, w, h) {
  const { alive, E, W, Sat, link, hue } = world;
  const Emax = meta.physics.Emax || 3.2;
  const mode = meta.renderMode || "combined";

  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const base = idx * 4;
      const a = alive[idx] === 1;
      if (!a) {
        data[base] = 0; data[base+1] = 0; data[base+2] = 0; data[base+3] = 0;
        continue;
      }

      const ev = clamp01(E[idx] / Emax);
      const wv = clamp01(W[idx]);
      const svf = clamp01(Sat?.[idx] ?? 0);
      const lk = clamp01(link[idx]);
      const mut = mutationIntensityFromTrait(world?.trait, idx);
      let cellHue = hue[idx];
      if (wv > 0.4) cellHue = cellHue * (1 - wv * 0.4) + 20 * (wv * 0.4);

      let sat = 70;
      let lit = 45;
      let alpha = 235;
      if (mode === "light") {
        sat = 20; lit = 65; alpha = 210;
      } else if (mode === "energy") {
        sat = 80; lit = 26 + ev * 54; alpha = 242;
      } else if (mode === "fields") {
        sat = 20 + (1 - svf) * 16;
        lit = 30 + ev * 24 - wv * 8;
        alpha = 145;
      } else if (mode === "diagnostic") {
        sat = 72 + lk * 16;
        lit = 25 + ev * 26 + (1 - wv) * 12;
        alpha = 205;
      } else if (mode === "cells") {
        sat = 12 + mut * 78; lit = 42 + ev * 28; alpha = 255;
      } else {
        sat = 8 + mut * 78 + lk * 6;
        lit = 28 + ev * 38 + lk * 8;
        alpha = Math.round((0.80 + ev * 0.15) * 255);
      }

      const c = hslToRgb(cellHue, sat, lit);
      data[base] = c[0];
      data[base+1] = c[1];
      data[base+2] = c[2];
      data[base+3] = alpha;
    }
  }
}

function drawNetworkLinks(ctx, world, offX, offY, tilePx, meta, sim) {
  if (tilePx < 5) return;
  const { w, h, alive, link, hue } = world;
  const N = w * h;
  const maxLinks = tilePx < 7 ? 1800 : 4500;
  const visual = getPlayerVisualState(world, meta, sim);
  const doctrinePalette = getDoctrinePalette(visual.doctrine, visual.synergies);
  let links = 0;
  ctx.save();
  ctx.lineWidth = Math.max(0.5, tilePx * 0.05);
  for (let i = 0; i < N; i++) {
    if (alive[i] !== 1 || link[i] < 0.18) continue;
    const x = i % w;
    const y = (i / w) | 0;
    const v = [];
    if (x + 1 < w) v.push(y * w + (x + 1));
    if (y + 1 < h) v.push((y + 1) * w + x);
    for (let n = 0; n < v.length; n++) {
      const j = v[n];
      if (alive[j] !== 1) continue;
      const strength = Math.min(link[i], link[j]);
      if (strength < 0.18) continue;
      const x1 = offX + x * tilePx + tilePx * 0.5;
      const y1 = offY + y * tilePx + tilePx * 0.5;
      const x2 = offX + (j % w) * tilePx + tilePx * 0.5;
      const y2 = offY + ((j / w) | 0) * tilePx + tilePx * 0.5;
      const mixHue = (((hue[i] || 0) + (hue[j] || 0)) * 0.5) % 360;
      const doctrineMix = doctrinePalette.bonus * 0.45 + 0.2;
      const c = hslToRgb(mixHue * (1 - doctrineMix) + doctrinePalette.hue * doctrineMix, 60 + doctrinePalette.bonus * 10, 58 + doctrinePalette.bonus * 8);
      ctx.strokeStyle = `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${0.04 + strength * (0.18 + doctrinePalette.bonus * 0.08)})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      links++;
      if (links >= maxLinks) break;
    }
    if (links >= maxLinks) break;
  }
  ctx.restore();
}

function hasStable2x2(world, x, y) {
  const { w, h, alive } = world;
  if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return false;
  const i = y * w + x;
  return alive[i] === 1 && alive[i + 1] === 1 && alive[i + w] === 1 && alive[i + w + 1] === 1;
}

function drawFieldGlyphs(ctx, world, offX, offY, tilePx) {
  if (tilePx < 7) return;
  const { w, h, R, W, Sat } = world;
  ctx.save();
  const every = tilePx >= 10 ? 1 : 2;
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      const cx = offX + x * tilePx + tilePx * 0.5;
      const cy = offY + y * tilePx + tilePx * 0.5;
      const rad = Math.max(1.2, tilePx * 0.28);
      const rv = clamp01(R?.[i] ?? 0);
      const wv = clamp01(W?.[i] ?? 0);
      const sv = clamp01(Sat?.[i] ?? 0);

      if (rv > 0.12) {
        ctx.strokeStyle = `rgba(120,255,120,${0.12 + rv * 0.32})`;
        ctx.lineWidth = Math.max(0.6, tilePx * 0.06);
        ctx.beginPath();
        ctx.arc(cx, cy, rad * (1.02 + rv * 0.45), Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
      if (wv > 0.12) {
        ctx.strokeStyle = `rgba(255,110,90,${0.12 + wv * 0.34})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rad * (1.05 + wv * 0.55), Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      if (sv > 0.12) {
        ctx.strokeStyle = `rgba(255,210,120,${0.10 + sv * 0.30})`;
        ctx.beginPath();
        ctx.arc(cx, cy, rad * (0.76 + sv * 0.40), Math.PI * 0.95, Math.PI * 1.45);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawPlantsOverlay(ctx, world, offX, offY, tilePx) {
  const { w, h, P, plantKind } = world;
  if (!P) return;
  const every = tilePx >= 10 ? 1 : 2;
  const showEmoji = tilePx >= 10;
  ctx.save();
  if (showEmoji) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(9, Math.floor(tilePx * 0.70))}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  }
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      const pv = clamp01(P[i] || 0);
      if (pv < 0.10) continue;
      const cx = offX + x * tilePx + tilePx * 0.5;
      const cy = offY + y * tilePx + tilePx * 0.5;
      const pk = Number(plantKind?.[i] ?? 0);
      const isRealPlant = pk !== 0 && pv >= 0.28;
      if (!isRealPlant) continue;
      if (showEmoji) {
        ctx.globalAlpha = 0.28 + pv * 0.72;
        ctx.fillText(pk < 0 ? "🌳" : "🌱", cx, cy + 0.5);
      } else {
        const r = Math.max(0.7, tilePx * 0.13);
        ctx.fillStyle = pk < 0 ? `rgba(120,255,170,${0.18 + pv * 0.42})` : `rgba(190,255,120,${0.18 + pv * 0.42})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawFieldHotspots(ctx, world, offX, offY, tilePx) {
  if (tilePx < 4) return;
  const { w, h, W, Sat } = world;
  ctx.save();
  const every = tilePx < 7 ? 2 : 1;
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      const hazard = clamp01((W[i] || 0) * 0.65 + (Sat?.[i] || 0) * 0.55);
      if (hazard < 0.72) continue;
      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      ctx.fillStyle = `rgba(255,120,92,${0.03 + (hazard - 0.72) * 0.16})`;
      ctx.fillRect(px, py, tilePx, tilePx);
    }
  }
  ctx.restore();
}

function drawClusterOverlay(ctx, world, offX, offY, tilePx) {
  const { w, h, clusterField, alive } = world;
  if (!clusterField || tilePx < 3) return;
  const every = tilePx < 6 ? 2 : 1;
  ctx.save();
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      if (alive[i] !== 1) continue;
      const cv = clamp01(clusterField[i] || 0);
      if (cv < 0.42) continue;
      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      ctx.fillStyle = `rgba(120,200,255,${0.04 + cv * 0.12})`;
      ctx.fillRect(px, py, tilePx * every, tilePx * every);
    }
  }
  ctx.restore();
}

function drawBirthChargeNodes(ctx, world, offX, offY, tilePx, tick = 0) {
  const { w, h, B, alive } = world;
  if (!B || tilePx < 3) return;
  const every = tilePx < 6 ? 2 : 1;
  ctx.save();
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      if (alive[i] === 1) continue;
      const bv = clamp01(B[i] || 0);
      if (bv < 0.05) continue;

      const cx = offX + x * tilePx + tilePx * 0.5;
      const cy = offY + y * tilePx + tilePx * 0.5;
      
      // Pulse effect
      const pulse = 0.8 + 0.2 * Math.sin(tick * 0.2 + i);
      const radius = Math.max(1.5, tilePx * 0.35 * bv * pulse);
      
      // Outer glow
      ctx.fillStyle = `rgba(77, 216, 248, ${0.1 + bv * 0.4})`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Core
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + bv * 0.6})`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      if (bv > 0.8) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawActionOverlay(ctx, world, meta, offX, offY, tilePx) {
  const { w, h, actionMap } = world;
  if (!actionMap || tilePx < 2) return;
  const every = tilePx < 5 ? 2 : 1;
  ctx.save();
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      const raw = actionMap[i] || 0;
      const showRemote = !!meta?.ui?.showRemoteAttackOverlay;
      const showDefense = !!meta?.ui?.showDefenseOverlay;
      const isRemote = raw >= 240;
      const isDefense = raw >= 200 && raw < 240;
      if (isRemote && !showRemote) continue;
      if (isDefense && !showDefense) continue;
      const a = raw / 255;
      if (a < 0.08) continue;
      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      const hue = isRemote ? 342 : isDefense ? 205 : (24 + a * 44);
      const alpha = 0.08 + a * 0.38;
      ctx.fillStyle = `hsla(${hue}, 90%, 62%, ${alpha})`;
      ctx.fillRect(px, py, tilePx * every, tilePx * every);
      if (tilePx >= 5) {
        ctx.strokeStyle = `hsla(${hue}, 96%, 74%, ${Math.min(0.62, alpha + 0.2)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, tilePx * every - 1, tilePx * every - 1);
      }
    }
  }
  ctx.restore();
}

function drawLightShadowOverlay(ctx, world, meta, offX, offY, tilePx) {
  const mode = meta?.renderMode || "combined";
  if (mode === "cells") return;
  const { w, h, L, W, Sat } = world;
  const every = tilePx < 6 ? 2 : 1;
  ctx.save();
  for (let y = 0; y < h; y += every) {
    for (let x = 0; x < w; x += every) {
      const i = y * w + x;
      const lv = clamp01(L?.[i] ?? 0);
      const sv = clamp01(Sat?.[i] ?? 0);
      const wv = clamp01(W?.[i] ?? 0);
      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      const shade = clamp01((1 - lv) * 0.58 + sv * 0.18 + wv * 0.14);
      const glow = clamp01(lv * 0.52 - (sv + wv) * 0.12);
      if (shade > 0.04) {
        ctx.fillStyle = `rgba(8, 12, 22, ${0.04 + shade * 0.14})`;
        ctx.fillRect(px, py, tilePx * every, tilePx * every);
      }
      if (glow > 0.06) {
        ctx.fillStyle = `rgba(176, 220, 255, ${0.02 + glow * 0.10})`;
        ctx.fillRect(px, py, tilePx * every, tilePx * every);
      }
    }
  }
  ctx.restore();
}

// Draw birth/death event markers on top
function drawEvents(ctx, world, offX, offY, tilePx) {
  if (tilePx < 3) return;
  const { w, h, born, died } = world;
  const N = w * h;
  ctx.save();
  for (let i = 0; i < N; i++) {
    if (!born[i] && !died[i]) continue;
    const x  = offX + (i % w) * tilePx + tilePx * 0.5;
    const y  = offY + ((i / w) | 0) * tilePx + tilePx * 0.5;
    const r  = Math.max(1.2, tilePx * 0.34);
    if (born[i]) {
      ctx.strokeStyle = "rgba(80,255,160,0.90)";
      ctx.lineWidth   = Math.max(1, tilePx * 0.10);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (tilePx >= 5) {
        ctx.fillStyle = "rgba(190,255,220,0.42)";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, r * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (died[i]) {
      ctx.strokeStyle = "rgba(255,100,80,0.88)";
      ctx.lineWidth   = Math.max(1, tilePx * 0.10);
      const s = r * 0.7;
      ctx.beginPath();
      ctx.moveTo(x-s, y-s); ctx.lineTo(x+s, y+s);
      ctx.moveTo(x+s, y-s); ctx.lineTo(x-s, y+s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRoundCells(ctx, world, offX, offY, tilePx, meta, sim, quality = 3) {
  const { w, h, alive, E, hue, trait, clusterField, superId } = world;
  const Emax = Number(meta?.physics?.Emax) || 3.2;
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
        const ev = clamp01((Number(E[i]) || 0) / Emax);
        const h0 = Number(hue[i]) || 0;
        const c = hslToRgb(h0, 38 + ev * 40, 46 + ev * 16);
        ctx.fillStyle = `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, 0.96)`;
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
      const cx = offX + x * tilePx + tilePx * 0.5;
      const cy = offY + y * tilePx + tilePx * 0.5;
      const ev = clamp01((Number(E[i]) || 0) / Emax);
      const mut = mutationIntensityFromTrait(trait, i);
      const cv = clamp01(clusterField?.[i] ?? 0);
      const inSuper = (superId?.[i] ?? -1) >= 0;
      const inModule = moduleMask ? moduleMask[i] === 1 : false;
      const radius = Math.max(1, tilePx * (inModule ? 0.26 : isHugeGrid ? 0.34 : 0.36 + ev * 0.10));
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(radius)) continue;
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
        ctx.fillStyle = `rgba(${Math.round(core[0])}, ${Math.round(core[1])}, ${Math.round(core[2])}, 0.96)`;
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
function drawGrid(ctx, offX, offY, imageW, imageH, tilePx, lodLevel = 0) {
  if (lodLevel > 0) return;
  // On dense grids show a lightweight macro-grid, so raster remains readable.
  if (tilePx < 18) {
    if (tilePx < 3) return;
    ctx.save();
    const minorEvery = tilePx >= 10 ? 1 : 2;
    const majorEvery = tilePx >= 8 ? 8 : 12;
    ctx.lineWidth = 1;
    ctx.strokeStyle = tilePx >= 10 ? "rgba(198,224,255,0.26)" : "rgba(198,224,255,0.18)";
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
    ctx.strokeStyle = "rgba(255,205,132,0.34)";
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
  const small = tilePx < 22;
  const minorStep = 1;
  const minorAlpha = small ? 0.04 : 0.06;
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

function drawSuperBlocks(ctx, world, offX, offY, tilePx, tick = 0) {
  const { w, h, superId } = world;
  if (!superId || tilePx < 2) return;
  const seen = new Set();
  ctx.save();
  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const a = y * w + x;
      const sid = superId[a];
      if (sid < 0 || seen.has(sid)) continue;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      if (superId[b] !== sid || superId[c] !== sid || superId[d] !== sid) continue;
      seen.add(sid);

      const pulse = 0.5 + 0.5 * Math.sin((tick + sid * 3) * 0.12);
      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      const size = tilePx * 2;
      const rad = Math.max(2, tilePx * 0.45);

      ctx.fillStyle = `rgba(100, 185, 255, ${0.06 + pulse * 0.08})`;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(px + 0.5, py + 0.5, size - 1, size - 1, rad);
        ctx.fill();
      } else {
        ctx.fillRect(px + 0.5, py + 0.5, size - 1, size - 1);
      }

      ctx.strokeStyle = `rgba(255, 225, 125, ${0.18 + pulse * 0.22})`;
      ctx.lineWidth = Math.max(1, tilePx * 0.14);
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(px + 0.5, py + 0.5, size - 1, size - 1, rad);
        ctx.stroke();
      } else {
        ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
      }
    }
  }
  ctx.restore();
}

function drawCanvasHud(ctx, state, CW, CH) {
  const { sim, meta } = state;
  const lines = [
    `t${sim.tick}  alive ${sim.aliveCount}`,
    `speed ${meta.speed}T/s  mode ${meta.renderMode}`,
    `N ${(sim.meanNutrientField || 0).toFixed(2)}  T ${(sim.meanToxinField || 0).toFixed(2)}  S ${(sim.meanSaturationField || 0).toFixed(2)}`,
    `P ${(sim.meanPlantField || 0).toFixed(2)}  div ${sim.lineageDiversity || 0}`,
    `evo ${Number(sim.evolutionStageMean || 1).toFixed(2)} / max ${sim.evolutionStageMax || 1}`,
    `cluster ${(clamp01(sim.clusterRatio || 0) * 100).toFixed(0)}%  reserve ${(sim.meanReserveAlive || 0).toFixed(2)}`,
    `B ${sim.birthsLastStep || 0}  D ${sim.deathsLastStep || 0}  M ${sim.mutationsLastStep || 0}`,
    `R ${sim.raidEventsLastStep || 0}  I ${sim.infectionsLastStep || 0}  K ${sim.conflictKillsLastStep || 0}  S2 ${sim.superCellsLastStep || 0}`,
  ];
  const pad = 8;
  const lh = 13;
  const boxW = 312;
  const boxH = pad * 2 + lines.length * lh;
  const x = 10;
  const y = 10;

  ctx.save();
  ctx.fillStyle = "rgba(18, 24, 36, 0.72)";
  ctx.strokeStyle = "rgba(230, 197, 134, 0.46)";
  ctx.lineWidth = 1;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x, y, boxW, boxH);
  }

  ctx.font = "11px JetBrains Mono, monospace";
  ctx.fillStyle = "rgba(245, 240, 230, 0.96)";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + pad, y + pad + 10 + i * lh);
  }

  const touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  if (touch) {
    const tip = "Touch: ✚ Tools  |  Drag = Paint";
    const tw = Math.min(260, Math.max(170, tip.length * 6.2));
    const tx = Math.max(10, CW - tw - 10);
    const ty = Math.max(10, CH - 34);
    ctx.fillStyle = "rgba(18, 24, 36, 0.66)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, 24, 10);
      ctx.fill();
    } else {
      ctx.fillRect(tx, ty, tw, 24);
    }
    ctx.fillStyle = "rgba(243, 229, 200, 0.95)";
    ctx.fillText(tip, tx + 8, ty + 15);
  }
  ctx.restore();
}

function drawFieldSurface(ctx, world, meta, offX, offY, tilePx, quality = 3) {
  const { w, h, L, R, W, Sat, P } = world;
  const mode = meta.renderMode || "combined";
  const detail = quality >= 2 && tilePx >= 5;
  const step = tilePx < 3 ? 2 : 1;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = y * w + x;
      const lv = clamp01(L?.[i] ?? 0);
      const rv = clamp01(R?.[i] ?? 0);
      const wv = clamp01(W?.[i] ?? 0);
      const sv = clamp01(Sat?.[i] ?? 0);
      const pv = clamp01(P?.[i] ?? 0);
      let r = 0, g = 0, b = 0;

      if (mode === "light") {
        const lum = 14 + lv * 220;
        r = lum; g = lum; b = lum;
      } else if (mode === "energy") {
        r = wv * 40; g = rv * 60; b = lv * 80;
      } else if (mode === "fields") {
        r = 18 + wv * 180 + sv * 90;
        g = 14 + rv * 170 + pv * 110 - wv * 36;
        b = 16 + lv * 70 + pv * 64 + (1 - sv) * 24;
      } else if (mode === "diagnostic") {
        r = 10 + wv * 170 + sv * 72 + (1 - lv) * 52;
        g = 10 + rv * 150 + pv * 92;
        b = 10 + lv * 140;
      } else if (mode === "cells") {
        r = 0; g = 0; b = 0;
      } else {
        // Cooler tactical palette: dark slate base with teal growth signal and restrained toxin heat.
        const nutrientGlow = clamp01(rv * 0.90 + pv * 0.35);
        const lightLift = clamp01(lv * 0.85);
        const toxinHeat = clamp01(wv * 0.70);
        const saturationMist = clamp01(sv * 0.55);
        r = 8 + lightLift * 10 + nutrientGlow * 10 + saturationMist * 8 + toxinHeat * 44;
        g = 14 + lightLift * 30 + nutrientGlow * 86 + saturationMist * 14 + toxinHeat * 20;
        b = 18 + lightLift * 44 + nutrientGlow * 28 + (1 - saturationMist) * 18 + toxinHeat * 8;
        if (toxinHeat > 0.02) {
          r += toxinHeat * 28;
          g -= toxinHeat * 6;
          b -= toxinHeat * 4;
        }
      }

      const px = offX + x * tilePx;
      const py = offY + y * tilePx;
      const size = tilePx * step;
      ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
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

// Offscreen pixel canvas (reused via context)
// Zone-Typ → [hue, label]
// Zone-Typ → [hue, label]
const ZONE_PALETTE = [
  null,                    // 0 = none
  [55,  "HARVEST"],        // 1 = gelb
  [210, "BUFFER"],         // 2 = blau
  [0,   "DEFENSE"],        // 3 = rot
  [280, "NEXUS"],          // 4 = violett
  [170, "QUARANTINE"],     // 5 = cyan
];

// Reusable context for offscreen canvases.
// Manages creation and resizing of ImageData buffers.
const _renderCtxCache = new Map();

function getRenderContext(w, h) {
  const key = `${w}x${h}`;
  if (_renderCtxCache.has(key)) return _renderCtxCache.get(key);

  const pixelCanvas = document.createElement("canvas");
  pixelCanvas.width = w; pixelCanvas.height = h;
  const pixelCtx  = pixelCanvas.getContext("2d", { willReadFrequently: true });
  const pixelData = pixelCtx.createImageData(w, h);

  const cellCanvas = document.createElement("canvas");
  cellCanvas.width = w; cellCanvas.height = h;
  const cellCtx  = cellCanvas.getContext("2d", { willReadFrequently: true });
  const cellData = cellCtx.createImageData(w, h);

  const context = {
    pixelCanvas, pixelCtx, pixelData,
    cellCanvas, cellCtx, cellData,
    w, h
  };
  _renderCtxCache.set(key, context);
  return context;
}

function drawZoneOverlay(ctx, world, offX, offY, tilePx) {
  const { w, h, zoneMap } = world;
  if (!zoneMap || tilePx < 1) return;
  ctx.save();
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const z = zoneMap[j * w + i];
      if (!z || z < 1 || z > 5) continue;
      const entry = ZONE_PALETTE[z];
      if (!entry) continue;
      const [hue] = entry;
      const px = offX + i * tilePx;
      const py = offY + j * tilePx;
      // Halbtransparenter Hintergrund-Tint
      ctx.fillStyle = `hsla(${hue},80%,55%,0.13)`;
      ctx.fillRect(px, py, tilePx, tilePx);
      // Rand-Linie für scharfe Sichtbarkeit
      ctx.strokeStyle = `hsla(${hue},90%,65%,0.45)`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, tilePx - 1, tilePx - 1);
    }
  }
  // Zone-Labels bei ausreichender Tile-Größe
  if (tilePx >= 14) {
    ctx.font = `bold ${Math.max(7, Math.min(10, tilePx * 0.55))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const z = zoneMap[j * w + i];
        if (!z || z < 1 || z > 5) continue;
        const entry = ZONE_PALETTE[z];
        if (!entry) continue;
        const [hue, label] = entry;
        ctx.fillStyle = `hsla(${hue},90%,80%,0.70)`;
        ctx.fillText(label[0], offX + i * tilePx + tilePx * 0.5, offY + j * tilePx + tilePx * 0.5);
      }
    }
  }
  ctx.restore();
}

// Reusable context for offscreen canvases.
// Manages creation and resizing of ImageData buffers.
let _pixelCanvas = null, _pixelCtx = null, _pixelData = null;
let _cellCanvas = null, _cellCtx = null, _cellData = null;
let _pw = 0, _ph = 0;

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
  const { world, meta, sim } = state;
  const { w, h } = world;
  const quality = clamp((perf?.quality ?? 3) | 0, 0, 3);
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
  const tactical = quality <= 1 || isHugeGrid;
  const balanced = quality === 2 || isHeavyGrid;

  // Composite to main canvas
  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, 0, CW, CH);
  
  // Always use full surface render to keep visible macro-patterns and avoid pixel-brei.
  ctx.imageSmoothingEnabled = false;
  drawFieldSurface(ctx, world, meta, offX, offY, tilePx, quality);

  // Overlays
  if (!tactical && quality >= 3 && lod.level <= 1) drawFieldHotspots(ctx, world, offX, offY, tilePx);
  if (quality >= 1 && lod.level <= 2 && !isHugeGrid) drawClusterOverlay(ctx, world, offX, offY, tilePx);
  
  // Always show Birth Charge Nodes for visual feedback of cell creation
  if (!tactical && quality >= 1 && lod.level <= 2) drawBirthChargeNodes(ctx, world, offX, offY, tilePx, sim?.tick || 0);

  if (quality >= 1 && lod.level <= 2) drawActionOverlay(ctx, world, meta, offX, offY, tilePx);
  if (!isHugeGrid && quality >= 1 && lod.level <= 2) drawLightShadowOverlay(ctx, world, meta, offX, offY, tilePx);
  if (!balanced && quality >= 2 && lod.level <= 2) drawNetworkLinks(ctx, world, offX, offY, tilePx, meta, sim);
  if (!tactical && quality >= 1 && lod.level <= 2) drawSuperBlocks(ctx, world, offX, offY, tilePx, sim?.tick || 0);
  drawRoundCells(ctx, world, offX, offY, tilePx, meta, sim, quality);
  if (!balanced && quality >= 3 && lod.level <= 1) drawFieldGlyphs(ctx, world, offX, offY, tilePx);
  if (!tactical && quality >= 1 && !isHugeGrid) drawPlantsOverlay(ctx, world, offX, offY, tilePx);
  if (quality >= 1) drawZoneOverlay(ctx, world, offX, offY, tilePx);
  if (quality >= 1) drawGrid(ctx, offX, offY, imageW, imageH, tilePx, lod.level);
  if (quality >= 1 && lod.level <= 2) drawEvents(ctx, world, offX, offY, tilePx);

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

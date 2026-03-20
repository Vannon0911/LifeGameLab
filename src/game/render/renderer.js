// ============================================================
// Renderer — Canvas Pixel Art Engine
// Pure: reads state, writes pixels. Never mutates state.
// No Math.random(). No dispatch(). imageSmoothingEnabled=false.
// ============================================================

import { TILE_SIZE, PALETTE } from "../ui/ui.constants.js";

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/**
 * Maps a single tile index to a palette index (0-6).
 * Reads from world arrays — zero allocations.
 */
function tileColorIndex(world, meta, idx) {
  const alive = world?.alive;
  if (!alive) return 0;

  const isAlive = (alive[idx] | 0) === 1;
  if (!isAlive) return 0;

  const playerLineageId = Number(meta?.playerLineageId || 1) | 0;
  const cpuLineageId    = Number(meta?.cpuLineageId    || 2) | 0;
  const lid = Number(world.lineageId?.[idx] || 0) | 0;

  if (lid === playerLineageId) return 1; // player worker
  if (lid === cpuLineageId)    return 2; // cpu worker
  return 1; // any other alive cell → player colour
}

/**
 * Computes a background colour index (0,3,4,5,6) for dead/terrain tiles.
 * Priority: infra > dna/core (resource overlay) > territory overlay.
 */
function bgColorIndex(world, meta, idx) {
  const zoneRole = world?.zoneRole;
  if (zoneRole) {
    const role = Number(zoneRole[idx] || 0) | 0;
    // 1=CORE, 2=DNA, 3=INFRA (ids.js values — kept independent of import)
    if (role === 3) return 4; // infra
    if (role === 1 || role === 2) return 3; // dna/core resource tile
  }

  const R = world?.R;
  if (R) {
    const rv = clamp01(Number(R[idx] || 0));
    if (rv >= 0.08) return 3; // resource (DNA energy)
  }

  // territory overlay (alive cells already handled above)
  const territory = world?.lineageId;
  const playerLineageId = Number(meta?.playerLineageId || 1) | 0;
  const cpuLineageId    = Number(meta?.cpuLineageId    || 2) | 0;
  if (territory) {
    const lid = Number(territory[idx] || 0) | 0;
    if (lid === playerLineageId) return 5;
    if (lid === cpuLineageId)    return 6;
  }
  return 0; // background
}

/**
 * Main draw entry. Fills canvas with 8×8 pixel-art tiles.
 * Called from main thread and from render.worker.js via drawFrame().
 */
export function drawFrame(ctx, state, perf = {}) {
  const {world, meta} = state;
  if (!world) {
    ctx.fillStyle = `#${PALETTE[0].toString(16).padStart(6, "0")}`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return null;
  }

  // Physical canvas dimensions from perf (worker path) or canvas itself.
  const CW = Number.isFinite(perf?.CW) && perf.CW > 0
    ? perf.CW
    : Math.max(1, ctx.canvas.width  || 1);
  const CH = Number.isFinite(perf?.CH) && perf.CH > 0
    ? perf.CH
    : Math.max(1, ctx.canvas.height || 1);

  // Always crisp — no anti-aliasing, ever.
  ctx.imageSmoothingEnabled = false;

  const {w, h} = world;
  if (!w || !h) return null;

  const TILE = TILE_SIZE; // 8 — hard-coded per spec

  // Grid fits without DPR scaling — physical pixels = logical pixels.
  const imageW = w * TILE;
  const imageH = h * TILE;
  const offX   = ((CW - imageW) / 2) | 0;
  const offY   = ((CH - imageH) / 2) | 0;

  // --- Clear background ---
  const bg = PALETTE[0];
  ctx.fillStyle = `#${bg.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, CW, CH);

  // --- Build a typed colour index map so we can batch fills per colour ---
  const total = w * h;
  const indexMap = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const alive = world.alive?.[i];
    if ((alive | 0) === 1) {
      indexMap[i] = tileColorIndex(world, meta, i);
    } else {
      indexMap[i] = bgColorIndex(world, meta, i);
    }
  }

  // --- Batch by palette index to minimise fillStyle changes ---
  for (let ci = 0; ci < PALETTE.length; ci++) {
    if (ci === 0) continue; // bg already drawn
    const hex = `#${PALETTE[ci].toString(16).padStart(6, "0")}`;
    ctx.fillStyle = hex;
    for (let i = 0; i < total; i++) {
      if (indexMap[i] !== ci) continue;
      const x = (i % w) | 0;
      const y = (i / w) | 0;
      ctx.fillRect(offX + x * TILE, offY + y * TILE, TILE, TILE);
    }
  }

  const tilePx = TILE;
  return {tilePx, offX, offY, dpr: 1, quality: 1, lod: {level: 0}};
}

/**
 * Main-thread entry point — wires canvas size then delegates to drawFrame.
 */
export function render(canvas, state, perf = null) {
  if (!canvas) return null;
  const {world} = state;
  if (!world) return null;

  // Physical canvas = grid pixels, no DPR scaling (spec: physical = logical).
  const {w, h} = world;
  const targetW = (w * TILE_SIZE) || canvas.width  || 300;
  const targetH = (h * TILE_SIZE) || canvas.height || 150;
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width  = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext("2d", {alpha: false});
  ctx.imageSmoothingEnabled = false;

  return drawFrame(ctx, state, {
    ...(perf || {}),
    CW: canvas.width,
    CH: canvas.height,
    dpr: 1,
  });
}

// ── Screen → World coordinate helper (used by ui.js for click handling) ───
export function screenToWorld(screenX, screenY, renderInfo, meta) {
  if (!renderInfo) return null;
  const {tilePx, offX, offY} = renderInfo;
  const wx = ((screenX - offX) / tilePx) | 0;
  const wy = ((screenY - offY) / tilePx) | 0;
  if (wx < 0 || wy < 0 || wx >= (meta?.gridW || 0) || wy >= (meta?.gridH || 0)) return null;
  return {x: wx, y: wy};
}

// ── computeFieldSurfaceColor stub — kept so render.worker.js keeps compiling ──
export function computeFieldSurfaceColor() { return [0, 0, 0]; }

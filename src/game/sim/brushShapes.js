// ============================================================
// Brush Shapes — Explicit disk/single-tile shapes with grid clipping
// size=1 → 1 tile (center only)
// size=2..5 → disk shape (Euclidean distance test)
// All offsets are pre-computed and clipped to grid boundaries.
// ============================================================

/**
 * Compute brush offsets (dx, dy) for a given brush size.
 * size=1 → [{dx:0, dy:0}]
 * size=2..5 → disk with radius = size - 1
 * @param {number} size - brush size (1–5)
 * @returns {Array<{dx: number, dy: number}>}
 */
export function getBrushOffsets(size) {
  const s = Math.max(1, Math.min(5, size | 0));
  if (s === 1) return [{ dx: 0, dy: 0 }];
  const r = s - 1;
  const rSq = r * r;
  const offsets = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= rSq) {
        offsets.push({ dx, dy });
      }
    }
  }
  return offsets;
}

/**
 * Get the actual tile positions affected by a brush stroke,
 * clipped to grid boundaries.
 * @param {number} centerX - center tile X
 * @param {number} centerY - center tile Y
 * @param {number} size - brush size (1–5)
 * @param {number} gridW - grid width in tiles
 * @param {number} gridH - grid height in tiles
 * @returns {Array<{x: number, y: number}>}
 */
export function getBrushTiles(centerX, centerY, size, gridW, gridH) {
  const offsets = getBrushOffsets(size);
  const tiles = [];
  for (let i = 0; i < offsets.length; i++) {
    const x = centerX + offsets[i].dx;
    const y = centerY + offsets[i].dy;
    if (x >= 0 && x < gridW && y >= 0 && y < gridH) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

/**
 * Pre-computed brush offset cache for sizes 1–5.
 * Avoids recomputing on every stroke.
 */
export const BRUSH_OFFSET_CACHE = Object.freeze(
  [1, 2, 3, 4, 5].map((s) => Object.freeze(getBrushOffsets(s)))
);

/**
 * Get cached brush offsets for a given size.
 * @param {number} size - brush size (1–5)
 * @returns {Array<{dx: number, dy: number}>}
 */
export function getCachedBrushOffsets(size) {
  const idx = Math.max(0, Math.min(4, (size | 0) - 1));
  return BRUSH_OFFSET_CACHE[idx];
}

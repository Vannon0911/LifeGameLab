// ============================================================
// Chunk-Based Grid System
// Clean API: getChunkCoord, getChunkKey, getChunkBounds
// Dirty-flag tracker for incremental recompute/render.
// ============================================================

export const CHUNK_SIZE = 8;

/**
 * Get the chunk coordinate for a tile position.
 * @param {number} tileX
 * @param {number} tileY
 * @returns {{ cx: number, cy: number }}
 */
export function getChunkCoord(tileX, tileY) {
  return {
    cx: (tileX / CHUNK_SIZE) | 0,
    cy: (tileY / CHUNK_SIZE) | 0,
  };
}

/**
 * Stable string key for a chunk. Safe for use as Map/object key.
 * @param {number} cx - chunk column
 * @param {number} cy - chunk row
 * @returns {string} e.g. "2:3"
 */
export function getChunkKey(cx, cy) {
  return `${cx | 0}:${cy | 0}`;
}

/**
 * Get the tile bounds for a chunk, clamped to grid dimensions.
 * @param {number} cx - chunk column
 * @param {number} cy - chunk row
 * @param {number} gridW - total grid width in tiles
 * @param {number} gridH - total grid height in tiles
 * @returns {{ x0: number, y0: number, x1: number, y1: number }}
 */
export function getChunkBounds(cx, cy, gridW, gridH) {
  const x0 = cx * CHUNK_SIZE;
  const y0 = cy * CHUNK_SIZE;
  return {
    x0,
    y0,
    x1: Math.min(x0 + CHUNK_SIZE, gridW),
    y1: Math.min(y0 + CHUNK_SIZE, gridH),
  };
}

/**
 * Grid dimensions in chunks.
 * @param {number} gridW
 * @param {number} gridH
 * @returns {{ chunksW: number, chunksH: number }}
 */
export function gridChunkDimensions(gridW, gridH) {
  return {
    chunksW: Math.ceil(gridW / CHUNK_SIZE),
    chunksH: Math.ceil(gridH / CHUNK_SIZE),
  };
}

/**
 * Flat chunk index from chunk coordinates.
 * @param {number} cx
 * @param {number} cy
 * @param {number} chunksW - number of chunk columns
 * @returns {number}
 */
export function chunkFlatIndex(cx, cy, chunksW) {
  return cy * chunksW + cx;
}

/**
 * Determine which chunks overlap a viewport rectangle (in tile coords).
 * @param {number} viewX0
 * @param {number} viewY0
 * @param {number} viewX1
 * @param {number} viewY1
 * @param {number} gridW
 * @param {number} gridH
 * @returns {Array<{ cx: number, cy: number, key: string }>}
 */
export function getChunksInView(viewX0, viewY0, viewX1, viewY1, gridW, gridH) {
  const { chunksW, chunksH } = gridChunkDimensions(gridW, gridH);
  const cx0 = Math.max(0, (viewX0 / CHUNK_SIZE) | 0);
  const cy0 = Math.max(0, (viewY0 / CHUNK_SIZE) | 0);
  const cx1 = Math.min(chunksW - 1, (viewX1 / CHUNK_SIZE) | 0);
  const cy1 = Math.min(chunksH - 1, (viewY1 / CHUNK_SIZE) | 0);
  const result = [];
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      result.push({ cx, cy, key: getChunkKey(cx, cy) });
    }
  }
  return result;
}

/**
 * Create a chunk dirty-flag tracker for a grid.
 * @param {number} gridW
 * @param {number} gridH
 */
export function createChunkTracker(gridW, gridH) {
  const { chunksW, chunksH } = gridChunkDimensions(gridW, gridH);
  const total = chunksW * chunksH;
  const dirty = new Uint8Array(total);
  dirty.fill(1); // all dirty initially

  return {
    chunksW,
    chunksH,
    total,

    /** Mark the chunk containing (tileX, tileY) as dirty. */
    markDirty(tileX, tileY) {
      const { cx, cy } = getChunkCoord(tileX, tileY);
      if (cx >= 0 && cx < chunksW && cy >= 0 && cy < chunksH) {
        dirty[chunkFlatIndex(cx, cy, chunksW)] = 1;
      }
    },

    /** Mark all chunks dirty. */
    markAllDirty() {
      dirty.fill(1);
    },

    /** Mark a specific chunk as clean. */
    markClean(cx, cy) {
      if (cx >= 0 && cx < chunksW && cy >= 0 && cy < chunksH) {
        dirty[chunkFlatIndex(cx, cy, chunksW)] = 0;
      }
    },

    /** Check if a chunk is dirty. */
    isDirty(cx, cy) {
      if (cx < 0 || cx >= chunksW || cy < 0 || cy >= chunksH) return false;
      return dirty[chunkFlatIndex(cx, cy, chunksW)] === 1;
    },

    /** Get all dirty chunks as array of { cx, cy, key }. */
    getDirtyChunks() {
      const result = [];
      for (let cy = 0; cy < chunksH; cy++) {
        for (let cx = 0; cx < chunksW; cx++) {
          if (dirty[chunkFlatIndex(cx, cy, chunksW)] === 1) {
            result.push({ cx, cy, key: getChunkKey(cx, cy) });
          }
        }
      }
      return result;
    },

    /**
     * Mark all chunks touched by a brush disk (by radius) as dirty.
     * Clips at grid bounds. Uses disk test: dx*dx + dy*dy <= r*r.
     * @param {number} tileX - center tile X
     * @param {number} tileY - center tile Y
     * @param {number} radius - disk radius in tiles (0 = single tile)
     * @param {number} gW - grid width
     * @param {number} gH - grid height
     */
    markBrushAreaByRadius(tileX, tileY, radius, gW, gH) {
      const r = Math.max(0, radius | 0);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r) continue;
          const tx = tileX + dx;
          const ty = tileY + dy;
          if (tx >= 0 && tx < gW && ty >= 0 && ty < gH) {
            this.markDirty(tx, ty);
          }
        }
      }
    },

    /**
     * Mark all chunks touched by a brush disk (by size) as dirty.
     * Brush size contract: size=1 → 1 tile, size=2 → 3×3 disk, size=3 → 5×5 disk, etc.
     * Conversion: radius = max(0, size - 1).
     * @param {number} tileX - center tile X
     * @param {number} tileY - center tile Y
     * @param {number} size - brush size (1–5)
     * @param {number} gW - grid width
     * @param {number} gH - grid height
     */
    markBrushAreaBySize(tileX, tileY, size, gW, gH) {
      const radius = Math.max(0, (size | 0) - 1);
      this.markBrushAreaByRadius(tileX, tileY, radius, gW, gH);
    },
  };
}

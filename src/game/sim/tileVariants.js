// ============================================================
// Tile Variants — Deterministic 4-variant selection per tile
// Depends ONLY on stable inputs: coordinates + surface/resource type.
// No session seed dependency — plan stays visually stable across
// seed regeneration.
// ============================================================

import { hashMix32 } from "../../kernel/determinism/rng.js";

const VARIANT_COUNT = 4;

// Stable salts to decorrelate surface vs resource variant selection
const SURFACE_SALT = 0x9e3779b9;
const RESOURCE_SALT = 0x517cc1b7;

/**
 * Select one of 4 visual variants for a tile.
 * Deterministic: same (tileX, tileY, layerTypeHash, salt) → same variant.
 * Uses only coordinate + type — no session/map seed involved.
 * @param {number} tileX - column in grid
 * @param {number} tileY - row in grid
 * @param {number} layerTypeHash - numeric hash of the layer type string
 * @param {number} salt - decorrelation salt (SURFACE_SALT or RESOURCE_SALT)
 * @returns {number} 0–3
 */
export function getTileVariant(tileX, tileY, layerTypeHash, salt) {
  const coordPacked = (((tileY | 0) & 0xFFFF) << 16) | ((tileX | 0) & 0xFFFF);
  const mixed = hashMix32(
    (coordPacked ^ ((layerTypeHash | 0) * (salt >>> 0))) >>> 0,
    (salt >>> 0)
  );
  return (mixed >>> 0) % VARIANT_COUNT;
}

/**
 * Simple string-to-number hash for type strings (surface type, resource kind).
 * Deterministic, pure.
 * @param {string} typeStr
 * @returns {number}
 */
export function typeStringHash(typeStr) {
  const s = String(typeStr || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Get surface tile variant (0–3) for a grid position.
 * @param {number} tileX
 * @param {number} tileY
 * @param {string} surfaceType - SURFACE_TYPE value
 * @returns {number} 0–3
 */
export function getSurfaceVariant(tileX, tileY, surfaceType) {
  return getTileVariant(tileX, tileY, typeStringHash(surfaceType), SURFACE_SALT);
}

/**
 * Get resource tile variant (0–3) for a grid position.
 * @param {number} tileX
 * @param {number} tileY
 * @param {string} resourceKind - RESOURCE_KIND_BUILDER value
 * @returns {number} 0–3
 */
export function getResourceVariant(tileX, tileY, resourceKind) {
  return getTileVariant(tileX, tileY, typeStringHash(resourceKind), RESOURCE_SALT);
}

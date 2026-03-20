// ============================================================
// Deterministic Map Seed Generation
// Source of truth: canonical Builder representation including
// gridW, gridH, surfacePlan, resourcePlan.
// allTilesFilled is a derived selector, NOT stored in state.
// ============================================================

import { hashString } from "../../kernel/determinism/rng.js";
import { stableStringify } from "../../kernel/store/signature.js";

/**
 * Selector: derive whether all tiles are filled from state.
 * NOT stored in state — avoids inconsistency with undo/redo.
 * A tile is "filled" if it has either a surface assignment or a resource assignment.
 * @param {object} state - full game state
 * @returns {boolean}
 */
export function selectAreAllTilesFilled(state) {
  const map = state?.map;
  const spec = map?.spec;
  if (!spec) return false;
  const gridW = spec.gridW | 0;
  const gridH = spec.gridH | 0;
  const total = gridW * gridH;
  if (total <= 0) return false;
  const surfacePlan = spec.surfacePlan && typeof spec.surfacePlan === "object" ? spec.surfacePlan : {};
  const resourcePlan = spec.resourcePlan && typeof spec.resourcePlan === "object" ? spec.resourcePlan : {};
  for (let i = 0; i < total; i++) {
    const key = String(i);
    const hasSurface = key in surfacePlan && surfacePlan[key] && typeof surfacePlan[key] === "object";
    const hasResource = key in resourcePlan && resourcePlan[key] && typeof resourcePlan[key] === "object";
    if (!hasSurface && !hasResource) return false;
  }
  return true;
}

/**
 * Generate a deterministic seed string from the canonical builder representation.
 * Includes gridW, gridH, surfacePlan, resourcePlan for full reproducibility.
 * Same canonical input → same seed output. Always.
 * @param {object} state - full game state
 * @returns {string} hex seed string (8 chars)
 */
export function generateMapSeed(state) {
  const map = state?.map;
  const spec = map?.spec;
  if (!spec) return "00000000";
  const canonical = {
    w: spec.gridW | 0,
    h: spec.gridH | 0,
    surfaces: spec.surfacePlan && typeof spec.surfacePlan === "object" ? spec.surfacePlan : {},
    resources: spec.resourcePlan && typeof spec.resourcePlan === "object" ? spec.resourcePlan : {},
  };
  const serialized = stableStringify(canonical);
  const hash = hashString(serialized);
  return hash.toString(16).padStart(8, "0");
}

/**
 * Format a seed for display: uppercase with separator.
 * e.g. "a1b2c3d4" → "A1B2-C3D4"
 * @param {string} seed
 * @returns {string}
 */
export function formatSeedDisplay(seed) {
  const s = String(seed || "").toUpperCase();
  if (s.length <= 4) return s;
  return s.slice(0, 4) + "-" + s.slice(4);
}

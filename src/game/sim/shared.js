// ============================================================
// Shared Sim Utilities (single source of truth)
// ============================================================
//
// Purpose:
// - Avoid drift between sim.js and reducer.js implementations.
// - Keep determinism: pure functions only.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function cloneTypedArray(ta) {
  return (ta && ArrayBuffer.isView(ta)) ? new ta.constructor(ta) : ta;
}

export function wrapHue(v) {
  return ((v % 360) + 360) % 360;
}

export function paintCircle({ w, h, x, y, radius, cb }) {
  const r = Math.max(1, radius | 0);
  const r2 = r * r;
  const minX = Math.max(0, x - r);
  const maxX = Math.min(w - 1, x + r);
  const minY = Math.max(0, y - r);
  const maxY = Math.min(h - 1, y + r);
  for (let yy = minY; yy <= maxY; yy++) {
    const dy = yy - y;
    for (let xx = minX; xx <= maxX; xx++) {
      const dx = xx - x;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const t = 1 - (d2 / Math.max(1, r2));
      const falloff = t * t;
      cb(yy * w + xx, falloff);
    }
  }
}

export function softClamp(v, lo, hi, edge = 0.18) {
  if (v < lo) return lo + (v - lo) * edge;
  if (v > hi) return hi + (v - hi) * edge;
  return v;
}

export function renormTraits(tr, o) {
  // Keep consistent across sim.js and reducer.js to prevent drift.
  tr[o + 0] = clamp(softClamp(tr[o + 0], 0.30, 3.00, 0.18), 0.22, 3.20);
  tr[o + 1] = clamp(softClamp(tr[o + 1], 0.01, 0.50, 0.18), 0.005, 0.60);
  tr[o + 2] = clamp(softClamp(tr[o + 2], 0.03, 0.30, 0.18), 0.02, 0.36);
  tr[o + 3] = clamp(softClamp(Math.max(tr[o + 2] + 0.01, tr[o + 3]), 0.05, 0.40, 0.20), 0.03, 0.50);
  tr[o + 4] = clamp(softClamp(tr[o + 4], 0.10, 2.50, 0.18), 0.06, 3.00);
  tr[o + 5] = clamp(softClamp(tr[o + 5], 0.05, 1.00, 0.20), 0.02, 1.20);
  tr[o + 6] = clamp(softClamp(tr[o + 6], 0.00, 1.00, 0.20), 0.00, 1.20);
}

export function defaultLineageMemory() {
  // Field superset used across sim + reducer (manifest-first coherence).
  return {
    light: 0.5,
    nutrient: 0.5,
    toxin: 0.5,
    resilience: 0.0,
    energySense: 0.5,
    xp: 0,
    stage: 1,
    stageProgress: 0,
    toxinMetabolism: 0,
    splitUnlock: 0,
    doctrine: "equilibrium",
    techs: [],
    synergies: [],
    lastTickUpdated: -1,
    lastSeenTick: -1,
    mutationScore: 0,
  };
}

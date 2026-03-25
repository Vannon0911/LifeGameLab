// ============================================================
// Universal Persistence — Platform Agnostic Driver Interface
// ============================================================

/**
 * createNullDriver
 * Default for headless environments (no persistence)
 */
export const createNullDriver = () => ({
  load: () => null,
  save: () => {},
  export: (doc) => console.log("Export not implemented for this platform", doc)
});

/**
 * createWebDriver
 * Full state persistence — WARNING: TypedArrays (Float32Array, Uint8Array etc.)
 * serialise as plain objects via JSON. Use createMetaOnlyWebDriver for game states.
 */
export const createWebDriver = (key = "llm_kernel_state") => ({
  load: () => {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    return JSON.parse(raw);
  },
  save: (doc) => {
    localStorage.setItem(key, JSON.stringify(doc));
  },
  export: (doc) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "state_export.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});

/**
 * createMetaOnlyWebDriver
 * Saves `meta` and `map` only.
 * Skips `world` (TypedArrays → would corrupt on JSON round-trip) and
 * `sim` (ephemeral tick-stats, always recomputed after GEN_WORLD + first SIM_STEP).
 *
 * Benefits:
 *  - No TypedArray corruption on page reload
 *  - ~100× smaller save payload → no frame-budget impact
 *  - User settings (speed, grid size, render mode) persist across reloads
 *  - World always regenerates fresh via GEN_WORLD on boot
 */
export const createMetaOnlyWebDriver = (key = "llm_kernel_meta_v1") => ({
  load: () => {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const doc = JSON.parse(raw);
    // Re-inject empty world/sim so sanitizeBySchema fills in defaults.
    if (doc && doc.state) {
      if (!doc.state.map || typeof doc.state.map !== "object" || Array.isArray(doc.state.map)) {
        doc.state.map = {};
      }
      doc.state.world = {};
      doc.state.sim = {};
    }
    return doc;
  },
  save: (doc) => {
    const slim = {
      schemaVersion: doc.schemaVersion,
      updatedAt: doc.updatedAt,
      revisionCount: doc.revisionCount,
      state: {
        meta: doc.state.meta,
        map: doc.state.map || {},
        world: {},
        sim: {},
      },
    };
    localStorage.setItem(key, JSON.stringify(slim));
  },
  export: createWebDriver().export,
});

// Autodetect default driver
export const getDefaultDriver = () => {
  if (typeof localStorage !== "undefined" && typeof document !== "undefined") {
    // Meta-only driver: fast, TypedArray-safe, preserves user settings.
    return createMetaOnlyWebDriver();
  }
  return createNullDriver();
};

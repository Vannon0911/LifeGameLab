// ============================================================
// Kernel Persistence Driver Interface (platform-neutral)
// ============================================================

/**
 * createNullDriver
 * Default for headless environments (no persistence)
 */
export const createNullDriver = () => ({
  load: () => null,
  save: () => {},
  export: (doc) => console.log("Export not implemented for this platform", doc),
});

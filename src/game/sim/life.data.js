// ============================================================
// Life Data — Traits, Mutations
// ============================================================

export const TRAIT_COUNT = 7;

// Default trait vector per cell
// [H, U, T_surv, T_birth, C_birth, share, tol]
export const TRAIT_DEFAULT = [1.00, 0.11, 0.10, 0.14, 0.90, 0.60, 0.50];
export const TRAIT_NAMES   = ["Ernte","Verbrauch","Überleben-L","Geburt-L","Kosten","Teilen","Toleranz"];

// Mutations are generated from local environment dynamics in sim.js.
// We keep no fixed mutation paths/archetypes here on purpose.

// ============================================================
// Map Builder Resources — Two-Axis Model
// Axis 1: resourceKind (TREE, STONE, WOOD_SOURCE) — what the resource IS
// Axis 2: resourceStage (PLACED, GROWING, MATURE, HARVESTED, DEPLETED, PROCESSED) — lifecycle phase
// This separation prevents absurd cross-kind transitions like Seed→Stone.
// Deterministic: no Math.random(), no Date.now()
// ============================================================

// --- Resource Kind (what the resource IS) ---
export const RESOURCE_KIND_BUILDER = Object.freeze({
  TREE: "tree",
  STONE: "stone",
  WOOD_SOURCE: "wood_source",
});

export const RESOURCE_KIND_BUILDER_VALUES = Object.freeze(
  Object.values(RESOURCE_KIND_BUILDER)
);

export const RESOURCE_KIND_BUILDER_LABEL = Object.freeze({
  [RESOURCE_KIND_BUILDER.TREE]: "Baum",
  [RESOURCE_KIND_BUILDER.STONE]: "Stein",
  [RESOURCE_KIND_BUILDER.WOOD_SOURCE]: "Holzquelle",
});

// --- Resource Stage (lifecycle phase) ---
export const RESOURCE_STAGE = Object.freeze({
  PLACED: "placed",
  GROWING: "growing",
  MATURE: "mature",
  HARVESTED: "harvested",
  DEPLETED: "depleted",
  PROCESSED: "processed",
});

export const RESOURCE_STAGE_VALUES = Object.freeze(
  Object.values(RESOURCE_STAGE)
);

export const RESOURCE_STAGE_LABEL = Object.freeze({
  [RESOURCE_STAGE.PLACED]: "Platziert",
  [RESOURCE_STAGE.GROWING]: "Wachsend",
  [RESOURCE_STAGE.MATURE]: "Reif",
  [RESOURCE_STAGE.HARVESTED]: "Geerntet",
  [RESOURCE_STAGE.DEPLETED]: "Erschoepft",
  [RESOURCE_STAGE.PROCESSED]: "Verarbeitet",
});

// --- Visual labels combining kind + stage (for builder palette) ---
export const RESOURCE_VISUAL_LABEL = Object.freeze({
  tree_placed: "Samen",
  tree_growing: "Jungpflanze",
  tree_mature: "Baum",
  tree_harvested: "Holz",
  tree_depleted: "Baumstumpf",
  tree_processed: "Bretter",
  stone_placed: "Stein",
  stone_growing: "Stein (gross)",
  stone_mature: "Fels",
  stone_harvested: "Abbaufeld",
  stone_depleted: "Abgebaut",
  stone_processed: "Steinblock",
  wood_source_placed: "Holzquelle",
  wood_source_growing: "Holzquelle (aktiv)",
  wood_source_mature: "Holzlager",
  wood_source_harvested: "Leeres Lager",
  wood_source_depleted: "Erschoepft",
  wood_source_processed: "Verarbeitet",
});

// --- Surface Types (4 types, 4 variants each) ---
export const SURFACE_TYPE = Object.freeze({
  GRASS: "grass",
  SAND: "sand",
  WATER: "water",
  ROCK: "rock",
});

export const SURFACE_TYPE_VALUES = Object.freeze(
  Object.values(SURFACE_TYPE)
);

export const SURFACE_TYPE_LABEL = Object.freeze({
  [SURFACE_TYPE.GRASS]: "Gras",
  [SURFACE_TYPE.SAND]: "Sand",
  [SURFACE_TYPE.WATER]: "Wasser",
  [SURFACE_TYPE.ROCK]: "Fels",
});

export const SURFACE_ACCENT = Object.freeze({
  [SURFACE_TYPE.GRASS]: "#6ec96e",
  [SURFACE_TYPE.SAND]: "#e2c87a",
  [SURFACE_TYPE.WATER]: "#5cb8e6",
  [SURFACE_TYPE.ROCK]: "#9a9aaa",
});

// --- Transition rules per kind ---
// Each kind has its own valid stage progression.
const TREE_TRANSITIONS = Object.freeze({
  [RESOURCE_STAGE.PLACED]: Object.freeze([RESOURCE_STAGE.GROWING]),
  [RESOURCE_STAGE.GROWING]: Object.freeze([RESOURCE_STAGE.MATURE]),
  [RESOURCE_STAGE.MATURE]: Object.freeze([RESOURCE_STAGE.HARVESTED]),
  [RESOURCE_STAGE.HARVESTED]: Object.freeze([RESOURCE_STAGE.DEPLETED, RESOURCE_STAGE.PROCESSED]),
  [RESOURCE_STAGE.DEPLETED]: Object.freeze([RESOURCE_STAGE.PLACED]),
  [RESOURCE_STAGE.PROCESSED]: Object.freeze([]),
});

const STONE_TRANSITIONS = Object.freeze({
  [RESOURCE_STAGE.PLACED]: Object.freeze([RESOURCE_STAGE.GROWING]),
  [RESOURCE_STAGE.GROWING]: Object.freeze([RESOURCE_STAGE.MATURE]),
  [RESOURCE_STAGE.MATURE]: Object.freeze([RESOURCE_STAGE.HARVESTED]),
  [RESOURCE_STAGE.HARVESTED]: Object.freeze([RESOURCE_STAGE.DEPLETED]),
  [RESOURCE_STAGE.DEPLETED]: Object.freeze([RESOURCE_STAGE.PROCESSED, RESOURCE_STAGE.PLACED]),
  [RESOURCE_STAGE.PROCESSED]: Object.freeze([]),
});

const WOOD_SOURCE_TRANSITIONS = Object.freeze({
  [RESOURCE_STAGE.PLACED]: Object.freeze([RESOURCE_STAGE.GROWING]),
  [RESOURCE_STAGE.GROWING]: Object.freeze([RESOURCE_STAGE.MATURE]),
  [RESOURCE_STAGE.MATURE]: Object.freeze([RESOURCE_STAGE.HARVESTED]),
  [RESOURCE_STAGE.HARVESTED]: Object.freeze([RESOURCE_STAGE.DEPLETED]),
  [RESOURCE_STAGE.DEPLETED]: Object.freeze([RESOURCE_STAGE.PROCESSED]),
  [RESOURCE_STAGE.PROCESSED]: Object.freeze([]),
});

export const RESOURCE_TRANSITIONS = Object.freeze({
  [RESOURCE_KIND_BUILDER.TREE]: TREE_TRANSITIONS,
  [RESOURCE_KIND_BUILDER.STONE]: STONE_TRANSITIONS,
  [RESOURCE_KIND_BUILDER.WOOD_SOURCE]: WOOD_SOURCE_TRANSITIONS,
});

/**
 * Check if a stage transition is valid for a given resource kind.
 * @param {string} kind - RESOURCE_KIND_BUILDER value
 * @param {string} fromStage - current RESOURCE_STAGE
 * @param {string} toStage - target RESOURCE_STAGE
 * @returns {boolean}
 */
export function canTransition(kind, fromStage, toStage) {
  const kindTransitions = RESOURCE_TRANSITIONS[kind];
  if (!kindTransitions) return false;
  const allowed = kindTransitions[fromStage];
  if (!allowed) return false;
  return allowed.includes(toStage);
}

/**
 * Get valid next stages for a resource.
 * @param {string} kind
 * @param {string} currentStage
 * @returns {string[]}
 */
export function getNextStages(kind, currentStage) {
  const kindTransitions = RESOURCE_TRANSITIONS[kind];
  if (!kindTransitions) return [];
  return kindTransitions[currentStage] || [];
}

/**
 * Combine kind + stage into a visual key for lookups.
 * @param {string} kind
 * @param {string} stage
 * @returns {string} e.g. "tree_mature"
 */
export function resourceVisualKey(kind, stage) {
  return `${kind}_${stage}`;
}

// --- Visual colors per kind+stage ---
export function getResourceColor(kind, stage) {
  const key = resourceVisualKey(kind, stage);
  switch (key) {
    case "tree_placed":           return [184, 212, 104];
    case "tree_growing":          return [126, 214, 126];
    case "tree_mature":           return [58, 170, 58];
    case "tree_harvested":        return [196, 152, 88];
    case "tree_depleted":         return [120, 100, 70];
    case "tree_processed":        return [212, 168, 78];
    case "stone_placed":          return [140, 140, 158];
    case "stone_growing":         return [155, 155, 170];
    case "stone_mature":          return [110, 110, 130];
    case "stone_harvested":       return [160, 120, 72];
    case "stone_depleted":        return [90, 90, 100];
    case "stone_processed":       return [175, 160, 130];
    case "wood_source_placed":    return [170, 130, 70];
    case "wood_source_growing":   return [185, 145, 85];
    case "wood_source_mature":    return [155, 115, 55];
    case "wood_source_harvested": return [130, 100, 50];
    case "wood_source_depleted":  return [100, 85, 60];
    case "wood_source_processed": return [200, 165, 90];
    default:                      return [80, 80, 80];
  }
}

// --- Visual colors per surface type (4 deterministic variants) ---
export function getSurfaceColor(surfaceType, variant) {
  const v = (variant | 0) & 3;
  const shift = v * 6 - 9;
  switch (surfaceType) {
    case SURFACE_TYPE.GRASS:
      return [42 + shift, 128 + shift, 42 + shift];
    case SURFACE_TYPE.SAND:
      return [210 + shift, 190 + shift, 120 + shift];
    case SURFACE_TYPE.WATER:
      return [40 + shift, 120 + shift, 200 + shift];
    case SURFACE_TYPE.ROCK:
      return [110 + shift, 110 + shift, 118 + shift];
    default:
      return [60, 60, 60];
  }
}

// --- Accent colors for UI ---
export const RESOURCE_KIND_ACCENT = Object.freeze({
  [RESOURCE_KIND_BUILDER.TREE]: "#3aaa3a",
  [RESOURCE_KIND_BUILDER.STONE]: "#8c8c9e",
  [RESOURCE_KIND_BUILDER.WOOD_SOURCE]: "#c49858",
});

export const RESOURCE_STAGE_ACCENT = Object.freeze({
  [RESOURCE_STAGE.PLACED]: "#b8d468",
  [RESOURCE_STAGE.GROWING]: "#7ed67e",
  [RESOURCE_STAGE.MATURE]: "#3aaa3a",
  [RESOURCE_STAGE.HARVESTED]: "#c49858",
  [RESOURCE_STAGE.DEPLETED]: "#6e6e78",
  [RESOURCE_STAGE.PROCESSED]: "#d4a84e",
});

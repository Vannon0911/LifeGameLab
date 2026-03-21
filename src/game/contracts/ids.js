export const WIN_MODE = Object.freeze({
  SUPREMACY: "supremacy",
  STOCKPILE: "stockpile",
  EFFICIENCY: "efficiency",
  EXTINCTION: "extinction",
  ENERGY_COLLAPSE: "energy_collapse",
  CORE_COLLAPSE: "core_collapse",
  VISION_BREAK: "vision_break",
  NETWORK_DECAY: "network_decay",
});

export const WIN_MODE_SELECTABLE = Object.freeze([
  WIN_MODE.SUPREMACY,
  WIN_MODE.STOCKPILE,
  WIN_MODE.EFFICIENCY,
]);

export const WIN_MODE_RESULT_LABEL = Object.freeze({
  [WIN_MODE.SUPREMACY]: "Energie-Suprematie",
  [WIN_MODE.STOCKPILE]: "Territorial-Dominanz",
  [WIN_MODE.EFFICIENCY]: "Effizienz-Meister",
  [WIN_MODE.EXTINCTION]: "Ausrottung",
  [WIN_MODE.ENERGY_COLLAPSE]: "Energie-Kollaps",
  [WIN_MODE.CORE_COLLAPSE]: "Kern-Kollaps",
  [WIN_MODE.VISION_BREAK]: "Sicht-Bruch",
  [WIN_MODE.NETWORK_DECAY]: "Netz-Zerfall",
});

export const GAME_RESULT = Object.freeze({
  NONE: "",
  WIN: "win",
  LOSS: "loss",
});

export const ZONE_ROLE = Object.freeze({
  NONE: 0,
  CORE: 1,
  DNA: 2,
  INFRA: 3,
});

export const CONTRACT_PROFILE = Object.freeze({
  LEGACY_CELL_RTS: "legacy_cell_rts",
  LIFEGAMELAB_RTS_V1_1: "lifegamelab_rts_v1_1",
});

export const ENTITY_KIND = Object.freeze({
  NONE: "none",
  WORKER: "worker",
  FIGHTER: "fighter",
  CORE: "core",
  BUILDING: "building",
});

export const RESOURCE_KIND = Object.freeze({
  RAW_PLANT: "raw_plant",
  ENERGY: "energy",
  SAPLING: "sapling",
  TREE_TRUNK: "tree_trunk",
  WOOD: "wood",
  STONE: "stone",
});

export const BUILDING_KIND = Object.freeze({
  CORE: "core",
  PLANT_HARVESTER: "plant_harvester",
  REPRODUCER: "reproducer",
  TREE_HARVESTER: "tree_harvester",
  SAWMILL: "sawmill",
  STONE_HARVESTER: "stone_harvester",
  WORKER_DEPOT: "worker_depot",
  HARVEST_STORAGE: "harvest_storage",
  DEFENSE_TOWER: "defense_tower",
  PRODUCTION_FACTORY: "production_factory",
  NEXUS_EXTENSION: "nexus_extension",
  SPLITTER: "splitter",
  MUTATOR: "mutator",
});

export const RUN_PHASE = Object.freeze({
  MAP_BUILDER: "map_builder",
  RUN_ACTIVE: "run_active",
  RESULT: "result",
});

export const RUN_PHASE_VALUES = Object.freeze([
  RUN_PHASE.MAP_BUILDER,
  RUN_PHASE.RUN_ACTIVE,
  RUN_PHASE.RESULT,
]);

export const ZONE_ROLE_VALUES = Object.freeze(Object.values(ZONE_ROLE));

export const OVERLAY_MODE = Object.freeze({
  NONE: "none",
  ENERGY: "energy",
  TOXIN: "toxin",
  NUTRIENT: "nutrient",
  TERRITORY: "territory",
  CONFLICT: "conflict",
});

export const OVERLAY_MODE_VALUES = Object.freeze([
  OVERLAY_MODE.NONE,
  OVERLAY_MODE.ENERGY,
  OVERLAY_MODE.TOXIN,
  OVERLAY_MODE.NUTRIENT,
  OVERLAY_MODE.TERRITORY,
  OVERLAY_MODE.CONFLICT,
]);

export const BRUSH_MODE = Object.freeze({
  OBSERVE: "observe",
  SPLIT_PLACE: "split_place",
  WORKER_HARVEST: "worker_harvest",
  ZONE_PAINT: "zone_paint",
  WORKER_ADD: "worker_add",
  WORKER_REMOVE: "worker_remove",
  LIGHT: "light",
  LIGHT_REMOVE: "light_remove",
  NUTRIENT: "nutrient",
  TOXIN: "toxin",
  SATURATION_RESET: "saturation_reset",
  // Builder-only brush modes
  SURFACE_PAINT: "surface_paint",
  RESOURCE_PLACE: "resource_place",
  ERASER: "eraser",
});

export const BRUSH_MODE_VALUES = Object.freeze([
  BRUSH_MODE.OBSERVE,
  BRUSH_MODE.SPLIT_PLACE,
  BRUSH_MODE.WORKER_HARVEST,
  BRUSH_MODE.ZONE_PAINT,
  BRUSH_MODE.WORKER_ADD,
  BRUSH_MODE.WORKER_REMOVE,
  BRUSH_MODE.LIGHT,
  BRUSH_MODE.LIGHT_REMOVE,
  BRUSH_MODE.NUTRIENT,
  BRUSH_MODE.TOXIN,
  BRUSH_MODE.SATURATION_RESET,
  BRUSH_MODE.SURFACE_PAINT,
  BRUSH_MODE.RESOURCE_PLACE,
  BRUSH_MODE.ERASER,
]);

// Builder-only brush modes (only available in MAP_BUILDER phase)
export const BUILDER_BRUSH_MODES = Object.freeze([
  BRUSH_MODE.SURFACE_PAINT,
  BRUSH_MODE.RESOURCE_PLACE,
  BRUSH_MODE.ERASER,
]);

export function isBuilderBrushMode(value) {
  return BUILDER_BRUSH_MODES.includes(String(value || ""));
}

export const GOAL_CODE = Object.freeze({
  HARVEST_SECURE: "harvest_secure",
  EXTINCT: "extinct",
  SURVIVE_ENERGY: "survive_energy",
  SURVIVE_TOXIN: "survive_toxin",
  EVOLUTION_READY: "evolution_ready",
  GROWTH: "growth",
  EXPANSION: "expansion",
});

export const GOAL_CODE_VALUES = Object.freeze([
  GOAL_CODE.HARVEST_SECURE,
  GOAL_CODE.EXTINCT,
  GOAL_CODE.SURVIVE_ENERGY,
  GOAL_CODE.SURVIVE_TOXIN,
  GOAL_CODE.EVOLUTION_READY,
  GOAL_CODE.GROWTH,
  GOAL_CODE.EXPANSION,
]);

export const RISK_CODE = Object.freeze({
  STABLE: "stable",
  UNSTABLE: "unstable",
  TOXIC: "toxic",
  CRITICAL: "critical",
  COLLAPSE: "collapse",
});

const SETS = {
  brush: new Set(BRUSH_MODE_VALUES),
  overlay: new Set(OVERLAY_MODE_VALUES),
  winSelectable: new Set(WIN_MODE_SELECTABLE),
  winAny: new Set(Object.values(WIN_MODE)),
  goal: new Set(GOAL_CODE_VALUES),
  result: new Set(Object.values(GAME_RESULT)),
  runPhase: new Set(RUN_PHASE_VALUES),
};

export function isBrushMode(value) {
  return SETS.brush.has(String(value || ""));
}

export function isOverlayMode(value) {
  return SETS.overlay.has(String(value || ""));
}

export function isSelectableWinMode(value) {
  return SETS.winSelectable.has(String(value || ""));
}

export function isWinMode(value) {
  return SETS.winAny.has(String(value || ""));
}

export function isRunPhase(value) {
  return SETS.runPhase.has(String(value || ""));
}

export function normalizeBrushMode(value, fallback = BRUSH_MODE.OBSERVE) {
  const v = String(value || "");
  return SETS.brush.has(v) ? v : fallback;
}

export function normalizeOverlayMode(value, fallback = OVERLAY_MODE.NONE) {
  const v = String(value || "");
  return SETS.overlay.has(v) ? v : fallback;
}

export function normalizeRunPhase(value, fallback = RUN_PHASE.RUN_ACTIVE) {
  const v = String(value || "");
  return SETS.runPhase.has(v) ? v : fallback;
}

export function normalizeGoalCode(value, fallback = GOAL_CODE.HARVEST_SECURE) {
  const v = String(value || "");
  return SETS.goal.has(v) ? v : fallback;
}

export function normalizeGameResult(value, fallback = GAME_RESULT.NONE) {
  const v = String(value || "");
  return SETS.result.has(v) ? v : fallback;
}

export function deriveRiskCode(sim) {
  const toxin = Number(sim?.meanToxinField || 0);
  const energyNet = Number(sim?.playerEnergyNet || 0);
  const playerAlive = Number(sim?.playerAliveCount || 0);
  if (playerAlive === 0 && Number(sim?.tick || 0) > 5) return RISK_CODE.COLLAPSE;
  if (energyNet < -2.2) return RISK_CODE.CRITICAL;
  if (toxin > 0.3) return RISK_CODE.TOXIC;
  if (energyNet < 0.45) return RISK_CODE.UNSTABLE;
  return RISK_CODE.STABLE;
}

export function deriveGoalCode(simLike, currentTick = Number(simLike?.tick || 0)) {
  const pDNA = Number(simLike?.playerDNA || 0);
  const pStage = Number(simLike?.playerStage || 1);
  const pAlive = Number(simLike?.playerAliveCount || 0);
  const pENet = Number(simLike?.playerEnergyNet || 0);
  const meanTox = Number(simLike?.meanToxinField || 0);
  const presetId = String(simLike?.worldPresetId || "");
  const dnaCost = pStage * 5;
  if (pAlive === 0 && currentTick > 5) return GOAL_CODE.EXTINCT;
  if (pENet < -3 && pAlive > 0) return GOAL_CODE.SURVIVE_ENERGY;
  if (meanTox > 0.30) return GOAL_CODE.SURVIVE_TOXIN;
  if (pDNA >= dnaCost) return GOAL_CODE.EVOLUTION_READY;
  if (presetId === "dry_basin" && pENet < 1.5) return GOAL_CODE.SURVIVE_ENERGY;
  if (presetId === "river_delta" && simLike?.infrastructureUnlocked && Number(simLike?.networkRatio || 0) >= 0.10) return GOAL_CODE.EXPANSION;
  if (presetId === "wet_meadow" && pAlive < 18) return GOAL_CODE.GROWTH;
  if (pAlive < 12) return GOAL_CODE.GROWTH;
  if (pENet > 8) return GOAL_CODE.EXPANSION;
  return GOAL_CODE.HARVEST_SECURE;
}

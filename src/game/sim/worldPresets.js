import { clamp } from "./shared.js";

export const WORLD_PRESET_IDS = Object.freeze([
  "river_delta",
  "dry_basin",
  "wet_meadow",
]);

export const BIOME_IDS = Object.freeze({
  barren_flats: 0,
  riverlands: 1,
  wet_forest: 2,
  dry_plains: 3,
  toxic_marsh: 4,
});

export const BIOME_LABELS = Object.freeze({
  [BIOME_IDS.barren_flats]: "Brachflaechen",
  [BIOME_IDS.riverlands]: "Riverlands",
  [BIOME_IDS.wet_forest]: "Nasswald",
  [BIOME_IDS.dry_plains]: "Trockenebene",
  [BIOME_IDS.toxic_marsh]: "Toxischer Sumpf",
});

export const WORLD_PRESETS = Object.freeze({
  river_delta: {
    id: "river_delta",
    label: "River Delta",
    description: "Hoher Wasserkorridor, klare Ufer und stabile Expansion.",
    waterBias: 0.24,
    waterSpread: 0.92,
    waterFan: 0.34,
    lightBias: 0.00,
    fertilityBias: 0.08,
    plantBoost: 0.10,
    physicsOverrides: {
      L_mean: 1.02,
      T_survive: 0.92,
      U_base: 0.88,
      R_gen: 1.08,
      plantCloudDensity: 1.10,
      W_decay: 1.05,
    },
  },
  dry_basin: {
    id: "dry_basin",
    label: "Dry Basin",
    description: "Wenig Wasser, hoher Lichtdruck und harte Stabilitaetsgates.",
    waterBias: -0.22,
    waterSpread: 0.38,
    waterFan: 0.08,
    lightBias: 0.10,
    fertilityBias: -0.10,
    plantBoost: -0.08,
    physicsOverrides: {
      L_mean: 1.16,
      U_base: 1.08,
      T_survive: 1.06,
      R_gen: 0.90,
      plantCloudDensity: 0.74,
    },
  },
  wet_meadow: {
    id: "wet_meadow",
    label: "Wet Meadow",
    description: "Gleichmaessige Feuchte, weichere Fruehphase und organisches Wachstum.",
    waterBias: 0.12,
    waterSpread: 0.68,
    waterFan: 0.18,
    lightBias: -0.04,
    fertilityBias: 0.14,
    plantBoost: 0.18,
    physicsOverrides: {
      L_mean: 0.94,
      T_survive: 0.96,
      R_gen: 1.12,
      plantCloudDensity: 1.20,
      seasonAmp: 0.90,
    },
  },
});

export function normalizeWorldPresetId(value, fallback = "river_delta") {
  const id = String(value || "");
  return Object.prototype.hasOwnProperty.call(WORLD_PRESETS, id) ? id : fallback;
}

export function getWorldPreset(value) {
  return WORLD_PRESETS[normalizeWorldPresetId(value)];
}

export function applyPresetPhysicsOverrides(basePhysics, presetId) {
  const preset = getWorldPreset(presetId);
  const src = preset.physicsOverrides || {};
  const out = { ...basePhysics };
  for (const key of Object.keys(src)) {
    const next = Number(src[key]);
    const prev = Number(out[key]);
    if (!Number.isFinite(next) || !Number.isFinite(prev)) continue;
    out[key] = clamp(prev * next, 0, 9999);
  }
  return out;
}

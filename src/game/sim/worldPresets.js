import { clamp } from "./shared.js";

export const START_WINDOWS_DEFAULT = Object.freeze({
  player: Object.freeze({ x0: 0.08, y0: 0.30, x1: 0.28, y1: 0.70 }),
  cpu: Object.freeze({ x0: 0.72, y0: 0.30, x1: 0.92, y1: 0.70 }),
});

export const WORLD_PRESET_IDS = Object.freeze([
  "river_delta",
  "dry_basin",
  "wet_meadow",
  "smoke_sprint",
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
    coreZoneUnlockCostEnergy: 12,
    phaseC: {
      dnaPlacementBudget: 4,
      nextInfraUnlockCostDNA: 30,
      dnaZoneAdjacencyRule: "touch_core_or_owned",
      dnaYieldScale: 6.0,
    },
    phaseD: {
      infraBuildCostEnergy: 10,
      infraBuildCostDNA: 8,
      visionRadiusCore: 2,
      visionRadiusDNA: 2,
      visionRadiusInfra: 1,
    },
    phaseE: {
      patternWeights: {
        line: 1.2,
        block: 1.0,
        loop: 1.0,
        branch: 1.1,
        dense_cluster: 0.9,
      },
      bonusScale: {
        energy: 1.1,
        dna: 1.0,
        stability: 1.0,
        vision: 1.1,
        defense: 1.0,
        transport: 1.2,
      },
    },
    startWindows: START_WINDOWS_DEFAULT,
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
    coreZoneUnlockCostEnergy: 16,
    phaseC: {
      dnaPlacementBudget: 4,
      nextInfraUnlockCostDNA: 30,
      dnaZoneAdjacencyRule: "touch_core_or_owned",
      dnaYieldScale: 6.0,
    },
    phaseD: {
      infraBuildCostEnergy: 10,
      infraBuildCostDNA: 8,
      visionRadiusCore: 2,
      visionRadiusDNA: 2,
      visionRadiusInfra: 1,
    },
    phaseE: {
      patternWeights: {
        line: 0.9,
        block: 1.0,
        loop: 1.0,
        branch: 0.9,
        dense_cluster: 1.2,
      },
      bonusScale: {
        energy: 0.9,
        dna: 1.0,
        stability: 1.2,
        vision: 0.9,
        defense: 1.2,
        transport: 0.9,
      },
    },
    startWindows: START_WINDOWS_DEFAULT,
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
    coreZoneUnlockCostEnergy: 10,
    phaseC: {
      dnaPlacementBudget: 4,
      nextInfraUnlockCostDNA: 30,
      dnaZoneAdjacencyRule: "touch_core_or_owned",
      dnaYieldScale: 6.0,
    },
    phaseD: {
      infraBuildCostEnergy: 10,
      infraBuildCostDNA: 8,
      visionRadiusCore: 2,
      visionRadiusDNA: 2,
      visionRadiusInfra: 1,
    },
    phaseE: {
      patternWeights: {
        line: 1.0,
        block: 1.1,
        loop: 1.2,
        branch: 1.0,
        dense_cluster: 1.0,
      },
      bonusScale: {
        energy: 1.0,
        dna: 1.1,
        stability: 1.1,
        vision: 1.0,
        defense: 1.0,
        transport: 1.0,
      },
    },
    startWindows: START_WINDOWS_DEFAULT,
    physicsOverrides: {
      L_mean: 0.94,
      T_survive: 0.96,
      R_gen: 1.12,
      plantCloudDensity: 1.20,
      seasonAmp: 0.90,
    },
  },
  smoke_sprint: {
    id: "smoke_sprint",
    label: "Smoke Sprint",
    description: "Kurzer offizieller Endpfad fuer reproduzierbare Smoke- und Demo-Runs.",
    waterBias: -0.34,
    waterSpread: 0.22,
    waterFan: 0.04,
    lightBias: -0.14,
    fertilityBias: -0.28,
    plantBoost: -0.34,
    coreZoneUnlockCostEnergy: 8,
    phaseC: {
      dnaPlacementBudget: 4,
      nextInfraUnlockCostDNA: 30,
      dnaZoneAdjacencyRule: "touch_core_or_owned",
      dnaYieldScale: 6.0,
    },
    phaseD: {
      infraBuildCostEnergy: 10,
      infraBuildCostDNA: 8,
      visionRadiusCore: 2,
      visionRadiusDNA: 2,
      visionRadiusInfra: 1,
    },
    phaseE: {
      patternWeights: {
        line: 1.0,
        block: 1.0,
        loop: 1.0,
        branch: 1.0,
        dense_cluster: 1.0,
      },
      bonusScale: {
        energy: 1.0,
        dna: 1.0,
        stability: 1.0,
        vision: 1.0,
        defense: 1.0,
        transport: 1.0,
      },
    },
    startWindows: START_WINDOWS_DEFAULT,
    physicsOverrides: {
      L_mean: 0.55,
      T_survive: 1.38,
      U_base: 3.80,
      R_gen: 0.30,
      plantCloudDensity: 0.14,
      W_decay: 0.58,
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

export function getStartWindowRange(windowDef, w, h) {
  const x0 = Math.max(0, Math.min(w, Math.floor(Number(windowDef?.x0 || 0) * w)));
  const x1 = Math.max(0, Math.min(w, Math.ceil(Number(windowDef?.x1 || 0) * w)));
  const y0 = Math.max(0, Math.min(h, Math.floor(Number(windowDef?.y0 || 0) * h)));
  const y1 = Math.max(0, Math.min(h, Math.ceil(Number(windowDef?.y1 || 0) * h)));
  return { x0, x1, y0, y1 };
}

export function isTileInStartWindow(x, y, w, h, windowDef) {
  const range = getStartWindowRange(windowDef, w, h);
  return x >= range.x0 && x <= (range.x1 - 1) && y >= range.y0 && y <= (range.y1 - 1);
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

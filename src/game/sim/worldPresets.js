// Stable public facade for preset ownership. Internal implementation lives in ./world/*.
export {
  START_WINDOWS_DEFAULT,
  WORLD_PRESET_IDS,
  BIOME_IDS,
  BIOME_LABELS,
  WORLD_PRESETS,
  normalizeWorldPresetId,
  getWorldPreset,
} from "./world/presetCatalog.js";

export {
  getStartWindowRange,
  isTileInStartWindow,
  applyPresetPhysicsOverrides,
} from "./world/presetRuntime.js";

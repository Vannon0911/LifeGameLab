// Stable public facade for MapSpec compile/runtime helpers. Internal implementation lives in ./mapspec/*.
export {
  MAPSPEC_VERSION,
  MAPSPEC_SOURCE,
  MAPSPEC_MODE,
  createLegacyPresetMapSpec,
  validateMapSpec,
  compileMapSpec,
  compileStateMapSpec,
} from "./mapspec/runtime.js";

// Stable public facade for deterministic world generation. Internal implementation lives in ./world/*.
export {
  seedDeterministicBootstrapCluster,
  applyMapSpecOverrides,
  generateWorld,
} from "./world/generationRuntime.js";

import { deriveRiskCode, normalizeGoalCode } from "../../game/contracts/ids.js";

const TOOL_ALIASES = Object.freeze({
  paint_light: "light",
  paint_light_remove: "light_remove",
  paint_nutrient: "nutrient",
  paint_toxin: "toxin",
  paint_reset: "saturation_reset",
});

export function buildLlmReadModel(state, benchmark = null) {
  const safeState = state && typeof state === "object" ? state : {};
  const playerLineageId = Number(safeState?.meta?.playerLineageId || 0);
  const memory = safeState?.world?.lineageMemory?.[playerLineageId] || {};
  const rawTool = String(safeState?.meta?.brushMode || "observe");
  const clusterRatio = Number(safeState?.sim?.clusterRatio || 0);
  const networkRatio = Number(safeState?.sim?.networkRatio || 0);
  const structure =
    clusterRatio >= 0.56 ? "colony_core" :
    clusterRatio >= 0.28 || networkRatio >= 0.22 ? "biomodule_2x2" :
    "single_cells";

  return {
    tick: Number(safeState?.sim?.tick || 0),
    running: !!safeState?.sim?.running,
    tool: TOOL_ALIASES[rawTool] || rawTool,
    stage: Number(safeState?.sim?.playerStage || 1),
    dna: Number(safeState?.sim?.playerDNA || 0),
    playerAlive: Number(safeState?.sim?.playerAliveCount || 0),
    cpuAlive: Number(safeState?.sim?.cpuAliveCount || 0),
    energyNet: Number(safeState?.sim?.playerEnergyNet || 0),
    clusterRatio,
    networkRatio,
    risk: deriveRiskCode(safeState?.sim || {}),
    mission: normalizeGoalCode(safeState?.sim?.goal || ""),
    structure,
    doctrine: String(memory.doctrine || "equilibrium"),
    techs: Array.isArray(memory.techs) ? memory.techs : [],
    synergies: Array.isArray(memory.synergies) ? memory.synergies : [],
    benchmark,
  };
}

export function renderLlmReadModelAsText(state, benchmark = null) {
  return JSON.stringify(buildLlmReadModel(state, benchmark), null, 2);
}

import { BRUSH_MODE } from "../../game/contracts/ids.js";
import { applyFogIntelToAdvisorModel } from "../../game/render/fogOfWar.js";
import { buildAdvisorModel } from "./advisorModel.js";

const TOOL_ALIASES = Object.freeze({
  paint_light: "light",
  paint_light_remove: "light_remove",
  paint_nutrient: "nutrient",
  paint_toxin: "toxin",
  paint_reset: "saturation_reset",
});

export function buildLlmReadModel(state, benchmark = null) {
  const safeState = state && typeof state === "object" ? state : {};
  const rawTool = String(safeState?.meta?.brushMode || BRUSH_MODE.OBSERVE);
  const advisorModel = applyFogIntelToAdvisorModel(
    buildAdvisorModel(safeState, { benchmark }),
    safeState,
  );
  return {
    ...advisorModel,
    tool: TOOL_ALIASES[rawTool] || rawTool,
  };
}

export function renderLlmReadModelAsText(state, benchmark = null) {
  return JSON.stringify(buildLlmReadModel(state, benchmark), null, 2);
}

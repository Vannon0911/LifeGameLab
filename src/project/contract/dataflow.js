import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";

const DISPATCH_SOURCES = Object.freeze({
  GEN_WORLD: ["src/app/main.js", "src/game/ui/ui.js"],
  CONFIRM_FOUNDATION: ["src/game/ui/ui.js"],
  CONFIRM_CORE_ZONE: ["src/game/ui/ui.js"],
  START_DNA_ZONE_SETUP: ["src/game/ui/ui.js"],
  TOGGLE_DNA_ZONE_CELL: ["src/game/ui/ui.js"],
  CONFIRM_DNA_ZONE: ["src/game/ui/ui.js"],
  BEGIN_INFRA_BUILD: ["src/game/ui/ui.js"],
  BUILD_INFRA_PATH: ["src/game/ui/ui.js"],
  CONFIRM_INFRA_PATH: ["src/game/ui/ui.js"],
  TOGGLE_RUNNING: ["src/app/main.js", "src/game/ui/ui.js"],
  SIM_STEP: ["src/app/main.js", "src/game/ui/ui.js"],
  SET_SPEED: ["src/game/ui/ui.js"],
  SET_SEED: ["src/game/ui/ui.js"],
  SET_SIZE: ["src/app/main.js", "src/game/ui/ui.js"],
  SET_WORLD_PRESET: ["src/game/ui/ui.js"],
  SET_RENDER_MODE: ["src/game/ui/ui.js"],
  SET_PHYSICS: ["src/game/ui/ui.js"],
  SET_BRUSH: ["src/game/ui/ui.js"],
  SET_UI: ["src/app/main.js", "src/game/ui/ui.js"],
  SET_GLOBAL_LEARNING: ["src/game/ui/ui.js"],
  RESET_GLOBAL_LEARNING: ["src/game/ui/ui.js"],
  PAINT_BRUSH: ["src/game/ui/ui.js"],
  PLACE_CELL: ["src/game/ui/ui.js"],
  PLACE_SPLIT_CLUSTER: ["src/game/ui/ui.js"],
  DEV_BALANCE_RUN_AI: ["src/app/main.js"],
  APPLY_BUFFERED_SIM_STEP: ["src/app/main.js"],
  HARVEST_CELL: ["src/game/ui/ui.js"],
  HARVEST_PULSE: ["src/game/ui/ui.js"],
  PRUNE_CLUSTER: ["src/game/ui/ui.js"],
  RECYCLE_PATCH: ["src/game/ui/ui.js"],
  SEED_SPREAD: ["src/game/ui/ui.js"],
  SET_ZONE: ["src/game/ui/ui.js"],
  BUY_EVOLUTION: ["src/game/ui/ui.js"],
  SET_PLAYER_DOCTRINE: ["src/game/ui/ui.js"],
  SET_OVERLAY: ["src/game/ui/ui.js"],
  SET_PLACEMENT_COST: [],
  RUN_BENCHMARK: ["src/game/ui/ui.js"],
});

export const dataflow = {
  actions: Object.fromEntries(Object.keys(actionSchema).map((type) => {
    const writes = Array.isArray(mutationMatrix[type]) ? [...mutationMatrix[type]] : [];
    const dispatchSources = Array.isArray(DISPATCH_SOURCES[type]) ? [...DISPATCH_SOURCES[type]] : [];
    return [type, {
      summary: `Action ${type} with manifest-gated writes`,
      contracts: { actionSchema: type, mutationMatrix: type },
      writes,
      dispatchSources,
    }];
  })),
};

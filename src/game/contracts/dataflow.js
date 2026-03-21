import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";
import { actionLifecycle } from "./actionLifecycle.js";

const DISPATCH_SOURCES = Object.freeze({
  GEN_WORLD: ["src/app/main.js", "src/game/ui/ui.input.js", "src/game/ui/ui.js", "src/game/ui/ui.overlay.js"],
  TOGGLE_RUNNING: ["src/app/main.js", "src/game/ui/ui.input.js", "src/game/ui/ui.overlay.js"],
  SIM_STEP: ["src/app/main.js", "src/game/ui/ui.input.js"],
  SET_SPEED: ["src/app/main.js"],
  SET_SEED: ["src/game/ui/ui.overlay.js"],
  SET_SIZE: [],
  SET_MAPSPEC: ["src/game/ui/ui.js"],
  SET_MAP_TILE: ["src/game/ui/ui.input.js"],
  SET_RENDER_MODE: ["src/app/main.js"],
  SET_PHYSICS: [],
  SET_BRUSH: [],
  SET_UI: ["src/game/ui/ui.input.js"],
  SET_GLOBAL_LEARNING: [],
  RESET_GLOBAL_LEARNING: [],
  SET_TILE: ["src/game/ui/ui.input.js"],
  SELECT_ENTITY: [],
  ISSUE_MOVE: ["src/game/ui/ui.js"],
  PLACE_WORKER: ["src/game/ui/ui.js"],
  PLACE_BUILDING: [],
  PLACE_BELT_SEGMENT: [],
  PLACE_LINE_SEGMENT: [],
  SET_CORE_ROUTING: [],
  QUEUE_WORKER: [],
  SPAWN_FIGHTER: [],
  ASSIGN_REPAIR: [],
  PLACE_SPLIT_CLUSTER: ["src/game/ui/ui.input.js"],
  HARVEST_WORKER: ["src/game/ui/ui.input.js"],
  SET_ZONE: ["src/game/ui/ui.input.js"],
  SET_MUTATOR_PATTERN: [],
  COMMIT_MUTATION: [],
  SET_WIN_MODE: [],
});

export const dataflow = {
  actions: Object.fromEntries(Object.keys(actionSchema).map((type) => {
    const writes = Array.isArray(mutationMatrix[type]) ? [...mutationMatrix[type]] : [];
    const dispatchSources = Array.isArray(DISPATCH_SOURCES[type]) ? [...DISPATCH_SOURCES[type]] : [];
    const lifecycle = actionLifecycle[type] || null;
    return [type, {
      summary: `Action ${type} with manifest-gated writes`,
      contracts: { actionSchema: type, mutationMatrix: type },
      writes,
      dispatchSources,
      lifecycle,
      plannedWrites: Array.isArray(lifecycle?.plannedWrites) ? [...lifecycle.plannedWrites] : [],
    }];
  })),
};

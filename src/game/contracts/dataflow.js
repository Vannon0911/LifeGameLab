import { actionSchema } from "./actionSchema.js";
import { mutationMatrix } from "./mutationMatrix.js";
import { actionLifecycle } from "./actionLifecycle.js";

const DISPATCH_SOURCES = Object.freeze({
  GEN_WORLD: ["src/app/main.js", "src/game/ui/ui.input.js", "src/game/ui/ui.js"],
  TOGGLE_RUNNING: ["src/app/main.js", "src/game/ui/ui.input.js"],
  SIM_STEP: ["src/app/main.js", "src/game/ui/ui.input.js"],
  SET_SPEED: ["src/app/main.js"],
  SET_SEED: [],
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
  ISSUE_MOVE: ["src/game/ui/ui.orders.js"],
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
  SET_SURFACE_TILE: ["src/game/ui/ui.input.js"],
  SET_RESOURCE_TILE: ["src/game/ui/ui.input.js"],
  ERASE_TILE_CONTENT: ["src/game/ui/ui.input.js"],
  BUILDER_UNDO: ["src/game/ui/ui.input.js"],
  BUILDER_REDO: ["src/game/ui/ui.input.js"],
  SET_BUILDER_BRUSH_SIZE: ["src/game/ui/ui.input.js"],
  GENERATE_MAP_SEED: ["src/game/ui/ui.input.js"],
});

export const dataflow = {
  actions: Object.fromEntries(Object.keys(actionSchema).map((type) => {
    const currentWrites = Array.isArray(mutationMatrix[type]) ? [...mutationMatrix[type]] : [];
    const dispatchSources = Array.isArray(DISPATCH_SOURCES[type]) ? [...DISPATCH_SOURCES[type]] : [];
    const lifecycle = actionLifecycle[type] || null;
    const plannedWrites = Array.isArray(lifecycle?.plannedWrites) ? [...lifecycle.plannedWrites] : [];
    return [type, {
      summary: `Action ${type} with manifest-gated writes`,
      contracts: { actionSchema: type, mutationMatrix: type },
      // `writes` is kept for compatibility; `currentWrites` is the canonical live set.
      writes: [...currentWrites],
      currentWrites,
      writeModel: Object.freeze({
        canonicalField: "currentWrites",
        compatibilityField: "writes",
        plannedField: "plannedWrites",
      }),
      dispatchSources,
      lifecycle,
      lifecycleStatus: lifecycle?.status || "unknown",
      plannedWrites,
    }];
  })),
};

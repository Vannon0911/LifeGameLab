export const ACTION_LIFECYCLE_STATUS = Object.freeze({
  STABLE: "stable",
  RENAME: "rename",
  DEPRECATED: "deprecated",
  NEW_SLICE_A: "new_slice_a",
});

const REPLACEMENT_GATES = Object.freeze([
  "dispatch_sources_removed",
  "reducer_case_removed",
  "tests_migrated",
  "replacement_wired",
]);

function stable(slice, notes, plannedWrites = []) {
  return {
    status: ACTION_LIFECYCLE_STATUS.STABLE,
    slice,
    replacement: "",
    plannedWrites,
    removalGates: [],
    notes,
  };
}

function rename(replacement, slice, notes, plannedWrites = []) {
  return {
    status: ACTION_LIFECYCLE_STATUS.RENAME,
    slice,
    replacement,
    plannedWrites,
    removalGates: [...REPLACEMENT_GATES],
    notes,
  };
}

function deprecated(replacement, slice, notes, plannedWrites = []) {
  return {
    status: ACTION_LIFECYCLE_STATUS.DEPRECATED,
    slice,
    replacement,
    plannedWrites,
    removalGates: [...REPLACEMENT_GATES],
    notes,
  };
}

function scaffold(slice, notes, plannedWrites = []) {
  return {
    status: ACTION_LIFECYCLE_STATUS.NEW_SLICE_A,
    slice,
    replacement: "",
    plannedWrites,
    removalGates: [],
    notes,
  };
}

export const actionLifecycle = Object.freeze({
  GEN_WORLD: stable(
    "foundation",
    "Canonical deterministic world boot entrypoint remains active.",
    ["/map/", "/meta/gridW", "/meta/gridH", "/meta/worldPresetId", "/meta/physics", "/world/", "/sim/"]
  ),
  CONFIRM_FOUNDATION: deprecated(
    "PLACE_CORE",
    "slice_c",
    "Founder confirmation is superseded by Phase 0 core placement.",
    ["/world/", "/sim/runPhase", "/sim/phase0CorePlaced", "/sim/phase0PlantsDelivered"]
  ),
  CONFIRM_CORE_ZONE: deprecated(
    "PLACE_CORE",
    "slice_c",
    "Legacy core-zone confirmation collapses into direct core placement.",
    ["/world/cores", "/sim/runPhase", "/sim/phase0CorePlaced"]
  ),
  START_DNA_ZONE_SETUP: deprecated(
    "PLACE_BUILDING",
    "slice_f",
    "DNA zone setup is replaced by RTS building placement.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  TOGGLE_DNA_ZONE_WORKER: deprecated(
    "PLACE_BUILDING",
    "slice_f",
    "DNA zone editing is replaced by explicit RTS footprints.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  CONFIRM_DNA_ZONE: deprecated(
    "PLACE_BUILDING",
    "slice_f",
    "DNA zone confirmation is replaced by committed RTS building placement.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  BEGIN_INFRA_BUILD: deprecated(
    "PLACE_LINE_SEGMENT",
    "slice_f",
    "Legacy infra build mode is replaced by power-line placement.",
    ["/world/powerLines", "/sim/lastCommand"]
  ),
  BUILD_INFRA_PATH: deprecated(
    "PLACE_LINE_SEGMENT",
    "slice_f",
    "Legacy infra path painting is replaced by explicit line segments.",
    ["/world/powerLines", "/sim/lastCommand"]
  ),
  CONFIRM_INFRA_PATH: deprecated(
    "PLACE_LINE_SEGMENT",
    "slice_f",
    "Legacy infra confirmation is replaced by direct line commits.",
    ["/world/powerLines", "/sim/lastCommand"]
  ),
  TOGGLE_RUNNING: stable(
    "foundation",
    "Runtime on/off remains canonical.",
    ["/sim/running"]
  ),
  SIM_STEP: stable(
    "foundation",
    "Tick execution remains canonical deterministic step entrypoint.",
    ["/world/", "/sim/"]
  ),
  SET_SPEED: stable(
    "foundation",
    "Tick speed remains canonical runtime control.",
    ["/meta/speed"]
  ),
  SET_SEED: stable(
    "foundation",
    "Seed selection remains canonical deterministic input.",
    ["/meta/seed"]
  ),
  SET_SIZE: stable(
    "foundation",
    "Grid size remains canonical deterministic world dimension input.",
    ["/meta/gridW", "/meta/gridH"]
  ),
  SET_WORLD_PRESET: rename(
    "SET_MAPSPEC",
    "slice_b",
    "Preset-based boot will be replaced by MapSpec compilation.",
    ["/map/", "/meta/gridW", "/meta/gridH", "/meta/worldPresetId"]
  ),
  SET_RENDER_MODE: stable(
    "foundation",
    "Render mode remains active until the new UI flow replaces it.",
    ["/meta/renderMode"]
  ),
  SET_PHYSICS: stable(
    "foundation",
    "Physics overrides remain canonical debug/runtime control.",
    ["/meta/physics"]
  ),
  SET_BRUSH: deprecated(
    "SELECT_ENTITY",
    "slice_c",
    "Gameplay brushes are retired in favor of direct RTS actions.",
    ["/meta/brushMode", "/meta/brushRadius"]
  ),
  SET_UI: stable(
    "foundation",
    "UI preferences remain canonical runtime control.",
    ["/meta/ui"]
  ),
  SET_GLOBAL_LEARNING: stable(
    "slice_i",
    "Global learning stays as replay and CPU snapshot input.",
    ["/meta/globalLearning", "/world/globalLearning"]
  ),
  RESET_GLOBAL_LEARNING: stable(
    "slice_i",
    "Global learning reset remains a valid deterministic admin control.",
    ["/meta/globalLearning", "/world/globalLearning", "/world/lineageMemory"]
  ),
  SET_TILE: stable(
    "slice_b",
    "Tile editing stays available for the internal Map Builder.",
    ["/world/R"]
  ),
  ISSUE_ORDER: rename(
    "ISSUE_MOVE",
    "slice_c",
    "Worker orders move from cell-order wording to explicit entity movement.",
    ["/sim/unitOrder", "/sim/activeOrder", "/sim/selectedUnit", "/sim/lastCommand"]
  ),
  PLACE_SPLIT_CLUSTER: deprecated(
    "PLACE_BUILDING",
    "slice_f",
    "Cluster split placement is replaced by explicit splitter building placement.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  HARVEST_WORKER: deprecated(
    "QUEUE_WORKER",
    "slice_e",
    "Cell harvest is replaced by worker-driven manual and automated collection.",
    ["/world/workers", "/sim/lastCommand"]
  ),
  HARVEST_PULSE: deprecated(
    "QUEUE_WORKER",
    "slice_e",
    "Pulse harvesting is replaced by worker and building production chains.",
    ["/world/workers", "/world/resourceNodes", "/sim/lastCommand"]
  ),
  PRUNE_CLUSTER: deprecated(
    "PLACE_BUILDING",
    "slice_e",
    "Cluster pruning is replaced by explicit production infrastructure.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  RECYCLE_PATCH: deprecated(
    "PLACE_BUILDING",
    "slice_e",
    "Patch recycling is replaced by explicit production chains and logistics.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  SEED_SPREAD: deprecated(
    "PLACE_BUILDING",
    "slice_e",
    "Seed spread is replaced by explicit reproduction buildings.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  SET_ZONE: deprecated(
    "PLACE_BUILDING",
    "slice_f",
    "Zone painting is replaced by direct RTS footprints and line placement.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  BUY_EVOLUTION: deprecated(
    "COMMIT_MUTATION",
    "slice_h",
    "Evolution purchases are replaced by mutator topology commits.",
    ["/sim/mutatorDraft", "/world/fighters", "/sim/lastCommand"]
  ),
  SET_PLAYER_DOCTRINE: deprecated(
    "SET_MUTATOR_PATTERN",
    "slice_h",
    "Doctrine toggles are replaced by explicit mutator pattern authoring.",
    ["/sim/mutatorDraft", "/sim/lastCommand"]
  ),
  SET_WIN_MODE: stable(
    "slice_i",
    "Selectable win modes remain canonical and map to the new RTS metrics.",
    ["/sim/winMode"]
  ),
  SET_OVERLAY: rename(
    "SET_UI",
    "slice_a",
    "Overlay choice survives only if the post-migration UI keeps overlays.",
    ["/meta/activeOverlay"]
  ),
  SET_PLACEMENT_COST: deprecated(
    "",
    "slice_c",
    "Placement-cost toggle is not part of the RTS contract surface.",
    ["/meta/placementCostEnabled"]
  ),
  SET_MAPSPEC: stable(
    "slice_b",
    "Canonical MapSpec input now drives deterministic world compilation.",
    ["/map/", "/meta/gridW", "/meta/gridH", "/meta/worldPresetId"]
  ),
  SET_MAP_TILE: stable(
    "slice_c",
    "Map Builder tile edits compile through the same deterministic MapSpec path as full mapspec updates.",
    ["/map/", "/meta/gridW", "/meta/gridH", "/meta/worldPresetId"]
  ),
  SELECT_ENTITY: scaffold(
    "slice_a",
    "Scaffolded RTS selection action; reducer wiring lands in Slice C.",
    ["/sim/selectedEntity"]
  ),
  ISSUE_MOVE: scaffold(
    "slice_a",
    "Scaffolded RTS movement action; reducer wiring lands in Slice C.",
    ["/sim/selectedEntity", "/sim/activeOrder", "/sim/lastCommand"]
  ),
  PLACE_CORE: scaffold(
    "slice_a",
    "Scaffolded Phase 0 core placement action; reducer wiring lands in Slice C.",
    ["/world/cores", "/sim/phase0PlantsDelivered", "/sim/phase0CorePlaced", "/sim/lastCommand"]
  ),
  PLACE_WORKER: scaffold(
    "slice_a",
    "Scaffolded worker placement action; reducer wiring lands in Slice C.",
    ["/world/workers", "/sim/phase0PlantsDelivered", "/sim/lastCommand"]
  ),
  PLACE_BUILDING: scaffold(
    "slice_a",
    "Scaffolded building placement action; reducer wiring lands in Slices E-F.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  PLACE_BELT_SEGMENT: scaffold(
    "slice_a",
    "Scaffolded belt placement action; reducer wiring lands in Slice E.",
    ["/world/belts", "/sim/lastCommand"]
  ),
  PLACE_LINE_SEGMENT: scaffold(
    "slice_a",
    "Scaffolded line placement action; reducer wiring lands in Slice G.",
    ["/world/powerLines", "/sim/lastCommand"]
  ),
  SET_CORE_ROUTING: scaffold(
    "slice_a",
    "Scaffolded routing action; reducer wiring lands in Slice F.",
    ["/world/cores", "/sim/lastCommand"]
  ),
  QUEUE_WORKER: scaffold(
    "slice_a",
    "Scaffolded worker queue action; reducer wiring lands in Slice D.",
    ["/world/workers", "/world/cores", "/sim/queuedWorkerCount", "/sim/lastCommand"]
  ),
  SPAWN_FIGHTER: scaffold(
    "slice_a",
    "Scaffolded fighter conversion action; reducer wiring lands in Slice H.",
    ["/world/fighters", "/world/workers", "/sim/lastCommand"]
  ),
  ASSIGN_REPAIR: scaffold(
    "slice_a",
    "Scaffolded repair assignment action; reducer wiring lands in Slice G.",
    ["/world/workers", "/sim/lastCommand"]
  ),
  SET_MUTATOR_PATTERN: scaffold(
    "slice_a",
    "Scaffolded mutator draft action; reducer wiring lands in Slice H.",
    ["/sim/mutatorDraft"]
  ),
  COMMIT_MUTATION: scaffold(
    "slice_a",
    "Scaffolded mutation commit action; reducer wiring lands in Slice H.",
    ["/sim/mutatorDraft", "/world/fighters", "/sim/lastCommand"]
  ),
});

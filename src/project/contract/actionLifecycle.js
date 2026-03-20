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
  TOGGLE_DNA_ZONE_WORKER: rename(
    "PLACE_BUILDING",
    "slice_f",
    "DNA zone editing remains as transitional compat path until direct building placement fully replaces the flow.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  BUILD_INFRA_PATH: rename(
    "PLACE_LINE_SEGMENT",
    "slice_f",
    "Infra path painting remains as transitional compat path until direct line-segment placement fully replaces the flow.",
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
    "Worker orders remain as compatibility input while entity-based move is canonical.",
    ["/sim/selectedUnit", "/sim/selectedEntity", "/sim/unitOrder", "/sim/activeOrder", "/sim/lastCommand"]
  ),
  PLACE_SPLIT_CLUSTER: rename(
    "PLACE_BUILDING",
    "slice_f",
    "Cluster split placement remains as transitional compat path until explicit splitter placement fully replaces the flow.",
    ["/world/buildings", "/sim/lastCommand"]
  ),
  HARVEST_WORKER: rename(
    "QUEUE_WORKER",
    "slice_e",
    "Worker harvest remains as transitional compat path until queue-driven collection fully replaces the flow.",
    ["/world/workers", "/sim/lastCommand"]
  ),
  SET_ZONE: rename(
    "PLACE_BUILDING",
    "slice_f",
    "Zone painting remains as transitional compat path until direct RTS footprint placement fully replaces the flow.",
    ["/world/buildings", "/sim/lastCommand"]
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
  SELECT_ENTITY: stable(
    "slice_c",
    "Canonical RTS entity selection action replaces SET_BRUSH for runtime input.",
    ["/sim/selectedEntity"]
  ),
  ISSUE_MOVE: stable(
    "slice_c",
    "Entity-based worker movement is the canonical live runtime order path.",
    ["/sim/selectedUnit", "/sim/selectedEntity", "/sim/unitOrder", "/sim/activeOrder", "/sim/lastCommand"]
  ),
  PLACE_CORE: stable(
    "slice_c",
    "Phase 0 core placement action replaces CONFIRM_FOUNDATION and CONFIRM_CORE_ZONE.",
    ["/world/cores", "/sim/phase0PlantsDelivered", "/sim/phase0CorePlaced", "/sim/lastCommand", "/world/alive", "/world/E", "/world/lineageId"]
  ),
  PLACE_WORKER: stable(
    "slice_c",
    "Worker placement is the canonical live runtime path for founder and worker commits.",
    ["/world/alive", "/world/E", "/world/reserve", "/world/link", "/world/lineageId", "/world/hue", "/world/trait", "/world/age", "/world/born", "/world/died", "/world/W", "/world/founderMask", "/sim/playerDNA", "/sim/founderPlaced"]
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

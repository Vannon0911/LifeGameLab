# 90 Action Write Matrix

| Action | Write Paths |
|---|---|
| GEN_WORLD | `/map/`, `/meta/gridW`, `/meta/gridH`, `/meta/worldPresetId`, `/meta/physics`, `/meta/playerLineageId`, `/meta/cpuLineageId`, `/world/`, `/world/actionMap`, `/sim/` |
| TOGGLE_RUNNING | `/sim/running` |
| SIM_STEP | `/meta/globalLearning`, `/meta/gridW`, `/meta/gridH`, `/meta/simStepCount`, `/sim/runSummary`, `/world/`, `/sim/` |
| SET_SPEED | `/meta/speed` |
| SET_SEED | `/meta/seed` |
| SET_SIZE | `/meta/gridW`, `/meta/gridH` |
| SET_MAPSPEC | `/map/`, `/meta/gridW`, `/meta/gridH`, `/meta/worldPresetId` |
| SET_MAP_TILE | `/map/`, `/meta/gridW`, `/meta/gridH`, `/meta/worldPresetId` |
| SET_SURFACE_TILE | `/map/spec/surfacePlan`, `/map/spec/generatedSeed` |
| SET_RESOURCE_TILE | `/map/spec/resourcePlan`, `/map/spec/generatedSeed` |
| ERASE_TILE_CONTENT | `/map/spec/surfacePlan`, `/map/spec/resourcePlan`, `/map/spec/generatedSeed` |
| BUILDER_UNDO | `/map/spec/surfacePlan`, `/map/spec/resourcePlan`, `/map/spec/generatedSeed` |
| BUILDER_REDO | `/map/spec/surfacePlan`, `/map/spec/resourcePlan`, `/map/spec/generatedSeed` |
| SET_BUILDER_BRUSH_SIZE | `/meta/brushRadius` |
| GENERATE_MAP_SEED | `/map/spec/generatedSeed` |
| SET_RENDER_MODE | `/meta/renderMode` |
| SET_PHYSICS | `/meta/physics` |
| SET_BRUSH | `/meta/brushMode`, `/meta/brushRadius` |
| SET_UI | `/meta/ui`, `/sim/runPhase` |
| SET_GLOBAL_LEARNING | `/meta/globalLearning`, `/world/globalLearning` |
| RESET_GLOBAL_LEARNING | `/meta/globalLearning`, `/world/globalLearning`, `/world/lineageMemory` |
| SET_TILE | `/world/R` |
| SELECT_ENTITY | `/sim/selectedEntity` |
| PLACE_WORKER | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/sim/playerDNA` |
| ISSUE_MOVE | `/sim/selectedUnit`, `/sim/selectedEntity`, `/sim/unitOrder`, `/sim/activeOrder`, `/sim/lastCommand` |
| PLACE_BUILDING | `/world/buildings`, `/sim/lastCommand` |
| PLACE_BELT_SEGMENT | `/world/belts`, `/sim/lastCommand` |
| PLACE_LINE_SEGMENT | `/world/powerLines`, `/sim/lastCommand` |
| SET_CORE_ROUTING | `/world/cores`, `/sim/lastCommand` |
| QUEUE_WORKER | `/world/workers`, `/world/cores`, `/sim/queuedWorkerCount`, `/sim/lastCommand` |
| SPAWN_FIGHTER | `/world/fighters`, `/world/workers`, `/sim/lastCommand` |
| ASSIGN_REPAIR | `/world/workers`, `/sim/lastCommand` |
| PLACE_SPLIT_CLUSTER | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/sim/playerDNA` |
| HARVEST_WORKER | `/sim/playerDNA`, `/sim/totalHarvested`, `/world/alive`, `/world/E` |
| SET_ZONE | `/world/zoneMap` |
| SET_MUTATOR_PATTERN | `/sim/mutatorDraft` |
| COMMIT_MUTATION | `/sim/mutatorDraft`, `/world/fighters`, `/sim/lastCommand` |
| SET_WIN_MODE | `/sim/winMode` |
Action Schema Count: 38
Mutation Matrix Count: 38

## Alignment Audit (2026-03-25)
- `aligned`: action schema, mutation matrix, lifecycle, and dataflow all expose 38 actions with no missing keys.
- `drifted`: 13 actions have lifecycle `plannedWrites` that differ from current `mutationMatrix` writes (`GEN_WORLD`, `SIM_STEP`, builder tile actions, and compatibility actions such as `SET_ZONE`).
- `duplicate`: compatibility gate entry points remain intentionally duplicated (`assertPluginDomainPatchesAllowed`, `assertSimPatchesAllowed`, `assertDomainPatchesAllowed`) and should stay synced.
- `ambiguous_naming`: compatibility action names (`PLACE_SPLIT_CLUSTER`, `HARVEST_WORKER`, `SET_ZONE`, `SET_BRUSH`) remain semantically mixed with RTS naming and require follow-up cleanup before deprecation removal.

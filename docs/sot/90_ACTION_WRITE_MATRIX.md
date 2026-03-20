# 90 Action Write Matrix

| Action | Write Paths |
|---|---|
| GEN_WORLD | `/meta/worldPresetId`, `/meta/physics`, `/meta/playerLineageId`, `/meta/cpuLineageId`, `/world/`, `/world/actionMap`, `/sim/` |
| CONFIRM_FOUNDATION | `/sim/runPhase`, `/sim/running` |
| CONFIRM_CORE_ZONE | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/world/coreZoneMask`, `/world/zoneRole`, `/world/zoneId`, `/world/zoneMeta`, `/sim/unlockedZoneTier`, `/sim/nextZoneUnlockKind`, `/sim/nextZoneUnlockCostEnergy`, `/sim/zoneUnlockProgress`, `/sim/coreEnergyStableTicks`, `/sim/zone2Unlocked`, `/sim/zone2PlacementBudget`, `/sim/dnaZoneCommitted`, `/sim/nextInfraUnlockCostDNA`, `/sim/cpuBootstrapDone`, `/sim/aliveCount`, `/sim/playerAliveCount`, `/sim/cpuAliveCount`, `/sim/runPhase`, `/sim/running` |
| TOGGLE_DNA_ZONE_WORKER | `/world/dnaZoneMask`, `/sim/zone2PlacementBudget` |
| BUILD_INFRA_PATH | `/world/infraCandidateMask` |
| TOGGLE_RUNNING | `/sim/running` |
| SIM_STEP | `/meta/globalLearning`, `/meta/gridW`, `/meta/gridH`, `/meta/simStepCount`, `/sim/runSummary`, `/world/`, `/sim/` |
| SET_SPEED | `/meta/speed` |
| SET_SEED | `/meta/seed` |
| SET_SIZE | `/meta/gridW`, `/meta/gridH` |
| SET_WORLD_PRESET | `/map/`, `/meta/gridW`, `/meta/gridH`, `/meta/worldPresetId` |
| SET_MAPSPEC | `/map/`, `/meta/gridW`, `/meta/gridH`, `/meta/worldPresetId` |
| SET_MAP_TILE | `/map/`, `/meta/gridW`, `/meta/gridH`, `/meta/worldPresetId` |
| SET_RENDER_MODE | `/meta/renderMode` |
| SET_PHYSICS | `/meta/physics` |
| SET_BRUSH | `/meta/brushMode`, `/meta/brushRadius` |
| SET_UI | `/meta/ui`, `/sim/runPhase` |
| SET_GLOBAL_LEARNING | `/meta/globalLearning`, `/world/globalLearning` |
| RESET_GLOBAL_LEARNING | `/meta/globalLearning`, `/world/globalLearning`, `/world/lineageMemory` |
| SET_TILE | `/world/R` |
| SELECT_ENTITY | `/sim/selectedEntity` |
| PLACE_WORKER | `/world/alive`, `/world/E`, `/world/reserve`, `/world/link`, `/world/lineageId`, `/world/hue`, `/world/trait`, `/world/age`, `/world/born`, `/world/died`, `/world/W`, `/world/founderMask`, `/sim/playerDNA`, `/sim/founderPlaced` |
| ISSUE_ORDER | `/sim/selectedUnit`, `/sim/selectedEntity`, `/sim/unitOrder`, `/sim/activeOrder`, `/sim/lastCommand` |
| ISSUE_MOVE | `/sim/selectedUnit`, `/sim/selectedEntity`, `/sim/unitOrder`, `/sim/activeOrder`, `/sim/lastCommand` |
| PLACE_CORE | `/world/cores`, `/sim/phase0PlantsDelivered`, `/sim/phase0CorePlaced`, `/sim/lastCommand`, `/world/alive`, `/world/E`, `/world/lineageId` |
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
| SET_OVERLAY | `/meta/activeOverlay` |
Action Schema Count: 39
Mutation Matrix Count: 39

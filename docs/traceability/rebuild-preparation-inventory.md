# Rebuild Preparation Inventory

Derived from:
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `src/project/contract/manifest.js`
- `src/project/contract/actionLifecycle.js`

This file is traceability evidence, not Source of Truth.

## Action Inventory
- `stable`: `GEN_WORLD`, `TOGGLE_RUNNING`, `SIM_STEP`, `SET_SPEED`, `SET_SEED`, `SET_SIZE`, `SET_RENDER_MODE`, `SET_PHYSICS`, `SET_UI`, `SET_GLOBAL_LEARNING`, `RESET_GLOBAL_LEARNING`, `SET_TILE`, `SET_WIN_MODE`
- `rename`: `SET_WORLD_PRESET -> SET_MAPSPEC`, `ISSUE_ORDER -> ISSUE_MOVE`, `SET_OVERLAY -> SET_UI`
- `deprecated`: `CONFIRM_FOUNDATION`, `CONFIRM_CORE_ZONE`, `START_DNA_ZONE_SETUP`, `TOGGLE_DNA_ZONE_CELL`, `CONFIRM_DNA_ZONE`, `BEGIN_INFRA_BUILD`, `BUILD_INFRA_PATH`, `CONFIRM_INFRA_PATH`, `SET_BRUSH`, `PLACE_SPLIT_CLUSTER`, `HARVEST_CELL`, `HARVEST_PULSE`, `PRUNE_CLUSTER`, `RECYCLE_PATCH`, `SEED_SPREAD`, `SET_ZONE`, `BUY_EVOLUTION`, `SET_PLAYER_DOCTRINE`, `SET_PLACEMENT_COST`
- `new_slice_a`: `SET_MAPSPEC`, `SELECT_ENTITY`, `ISSUE_MOVE`, `PLACE_CORE`, `PLACE_WORKER`, `PLACE_BUILDING`, `PLACE_BELT_SEGMENT`, `PLACE_LINE_SEGMENT`, `SET_CORE_ROUTING`, `QUEUE_WORKER`, `SPAWN_FIGHTER`, `ASSIGN_REPAIR`, `SET_MUTATOR_PATTERN`, `COMMIT_MUTATION`

## State Inventory
- `keep`: `meta.seed`, `meta.gridW`, `meta.gridH`, `meta.speed`, `meta.renderMode`, `meta.ui`, `meta.globalLearning`, `world`, `sim.tick`, `sim.running`, `sim.runPhase`, `sim.lastCommand`, `sim.gameResult`, `sim.winMode`, `sim.runSummary`
- `adapt`: `meta.worldPresetId`, `meta.activeOverlay`, `sim.activeOrder`, `sim.patternCatalog`, `sim.patternBonuses`, `sim.playerAliveCount`, `sim.cpuAliveCount`, `sim.playerEnergyIn`, `sim.playerEnergyOut`, `sim.playerEnergyNet`, `sim.playerEnergyStored`
- `replace`: founder and DNA flow keys, infrastructure unlock keys, evolution and doctrine keys
- `slice_a_scaffold`: top-level `map`, `sim.phase0PlantsDelivered`, `sim.phase0CorePlaced`, `sim.queuedWorkerCount`, `sim.selectedEntity`, `sim.mutatorDraft`, `sim.deprecatedActionMode`
- `delete_later`: `sim.founderBudget`, `sim.founderPlaced`, `sim.unlockedZoneTier`, `sim.zone2Unlocked`, `sim.zone2PlacementBudget`, `sim.dnaZoneCommitted`, `sim.infrastructureUnlocked`, `sim.infraBuildMode`, `sim.infraBuildCostEnergy`, `sim.infraBuildCostDNA`, `sim.playerDNA`, `sim.playerStage`

## Module Inventory
- `keep`: `src/kernel/store/createStore.js`, `src/kernel/store/applyPatches.js`, `src/app/main.js`, `src/game/render/renderer.js`
- `adapt`: `src/game/sim/cellPatterns.js`, `src/game/sim/patterns.js`, `src/game/sim/worldAi.js`, `src/game/sim/reducer/winConditions.js`
- `extract`: future RTS runtime modules from current reducer and contract scaffolding
- `retire_after_replacement`: `src/game/sim/foundationEligibility.js`, legacy zone and DNA runtime paths, brush-driven gameplay wiring, cluster/evolution product flows

## Test Inventory
- Existing truth line: determinism, replay, bypass and LLM gate tests under `tests/`
- New migration guard: `tests/test-slice-a-contract-scaffold.mjs`
- Slice-B dispatch/builder guards: `tests/test-mapspec-dispatch-sources.mjs`, `tests/test-mapspec-builder-pipeline.mjs`
- UI click guard for mounted modules: `tests/test-ui-click-placement-e2e.mjs`
- Removal guard rule: no legacy path deletion without a passing replacement test

## Replacement Gates
Each deprecated action or module must satisfy all of the following before deletion:
1. Dispatch sources are removed.
2. Reducer case is removed.
3. Tests are migrated.
4. Replacement wiring is live.

## Residual Cleanup
- `tools/demo-live-attest.mjs`
- `tools/evidence-runner.mjs`

# Rebuild Preparation Inventory

Derived from:
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `src/game/contracts/manifest.js`
- `src/game/contracts/actionLifecycle.js`

This file is traceability evidence, not Source of Truth.

## Action Inventory
- `stable`: `GEN_WORLD`, `TOGGLE_RUNNING`, `SIM_STEP`, `SET_SPEED`, `SET_SEED`, `SET_SIZE`, `SET_RENDER_MODE`, `SET_PHYSICS`, `SET_UI`, `SET_GLOBAL_LEARNING`, `RESET_GLOBAL_LEARNING`, `SET_TILE`, `SET_WIN_MODE`, `SET_MAPSPEC`, `SET_MAP_TILE`, `ISSUE_MOVE`, `PLACE_WORKER`
- `rename`: `TOGGLE_DNA_ZONE_WORKER -> PLACE_BUILDING`, `BUILD_INFRA_PATH -> PLACE_LINE_SEGMENT`
- `compat_active`: `PLACE_SPLIT_CLUSTER`, `HARVEST_WORKER`, `SET_ZONE`, `SET_BRUSH`
- `dead_line_removed`: `CONFIRM_FOUNDATION`, `CONFIRM_CORE_ZONE`, `PLACE_CORE`
- `new_slice_a`: `SELECT_ENTITY`, `PLACE_BUILDING`, `PLACE_BELT_SEGMENT`, `PLACE_LINE_SEGMENT`, `SET_CORE_ROUTING`, `QUEUE_WORKER`, `SPAWN_FIGHTER`, `ASSIGN_REPAIR`, `SET_MUTATOR_PATTERN`, `COMMIT_MUTATION`

## State Inventory
- `keep`: `meta.seed`, `meta.gridW`, `meta.gridH`, `meta.speed`, `meta.renderMode`, `meta.ui`, `meta.globalLearning`, `world`, `sim.tick`, `sim.running`, `sim.runPhase`, `sim.lastCommand`, `sim.gameResult`, `sim.winMode`, `sim.runSummary`
- `adapt`: `meta.worldPresetId`, `meta.activeOverlay`, `sim.activeOrder`, `sim.playerAliveCount`, `sim.cpuAliveCount`, `sim.playerEnergyIn`, `sim.playerEnergyOut`, `sim.playerEnergyNet`, `sim.playerEnergyStored`
- `replace`: founder and DNA flow keys, infrastructure unlock keys, evolution and doctrine keys
- `slice_a_scaffold`: top-level `map`, `sim.queuedWorkerCount`, `sim.selectedEntity`, `sim.mutatorDraft`
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
- `devtools/demo-live-attest.mjs`
- `devtools/evidence-runner.mjs`

## Inventory Sync Snapshot (2026-03-25)

Scope reviewed:
- runtime: `src/app/main.js`, `src/kernel/store/createStore.js`, `src/kernel/store/persistence.js`
- sim/contracts/gates: `src/game/contracts/*.js`, `src/game/plugin/gates.js`, `src/game/sim/gate.js`, `src/kernel/validation/assertDomainPatchesAllowed.js`
- ui wiring: `src/game/ui/ui.input.js`, `src/game/ui/ui.js`, `src/game/ui/ui.orders.js`
- tests/tools: `tests/test-*.mjs`, `tests/evidence/*.mjs`, `tools/check-llm-pipeline.mjs`, `tools/llm-preflight.mjs`

Categorized inventory entries:
| Area | Item | Category | Action note |
| --- | --- | --- | --- |
| contracts | `actionSchema`/`mutationMatrix`/`actionLifecycle`/`dataflow` key coverage (38/38) | aligned | Keep as hard gate in contract tests. |
| contracts | lifecycle `plannedWrites` vs live `mutationMatrix` writes (13 actions) | drifted | Reconcile planned vs live writes before removing compatibility routes. |
| runtime+ui | stable actions with zero dispatch sources (`SET_SEED`, `SET_SIZE`, `SET_PHYSICS`, `SET_GLOBAL_LEARNING`, `RESET_GLOBAL_LEARNING`, `SELECT_ENTITY`, `SET_WIN_MODE`) | drifted | Either wire UI/runtime dispatch or mark as non-UI/system-only in docs. |
| gates | `assertPluginDomainPatchesAllowed` + `assertSimPatchesAllowed` + `assertDomainPatchesAllowed` | duplicate | Keep facade duplication intentional and documented; avoid behavior divergence. |
| naming | `PLACE_SPLIT_CLUSTER`, `HARVEST_WORKER`, `SET_ZONE`, `SET_BRUSH` in mixed RTS/legacy naming lane | ambiguous naming | Complete rename/deprecation cleanup after dispatch and reducer removal gates pass. |
| tests | deterministic + replay + contract + redteam suites present under `tests/` | aligned | Preserve as baseline for cleanup migrations. |
| tools | `tools/check-llm-pipeline.mjs` + `tools/llm-preflight.mjs` include cycle-gate and cache validation flow | aligned | Keep doc wording synced with command set (`spawn-proof`, `cache-sync`, `cache-validate`). |

Summary counts:
- `aligned`: 3
- `drifted`: 2
- `duplicate`: 1
- `ambiguous naming`: 1

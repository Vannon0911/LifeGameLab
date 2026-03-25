# STATUS - Current Head

## Snapshot (2026-03-20)
- Runtime now boots directly against canonical `src/game/*` and `src/kernel/*` modules; legacy `src/project/*` and `src/core/kernel/*` facades were removed.
- Dev-only LLM helpers now live under `tools/llm/*`, and runtime/UI imports no longer depend on LLM modules.
- Sim cleanup follow-up landed: foundation eligibility moved to `src/game/runtime/foundationEligibility.js`, fog intel moved to `src/game/viewmodel/fogIntel.js`, and Lage-panel stat helpers moved to `src/game/viewmodel/lageStats.js`.
- Reducer cleanup continued: phase gating moved into `src/game/sim/gates/phaseGates.js`, and worker order parsing/patch builders moved into `src/game/sim/commands/orderCommands.js`.
- Reducer cleanup continued again: grid and mask helpers moved into `src/game/sim/grid/index.js`, and active order execution moved into `src/game/runtime/processActiveOrderRuntime.js` with navigation in `src/game/runtime/orderNavigation.js`.
- Runtime/sim helper cleanup continued: shared alive/role/mask counters moved into `src/game/runtime/stateCounts.js`, removing duplicate counting logic between reducer and win-conditions.
- Runtime/sim helper cleanup continued again: infra candidate-mask hydration and committed-anchor checks moved into `src/game/runtime/infraRuntime.js`, shrinking inline infra staging logic in the reducer.
- Worldgen/MapSpec/presets cleanup landed behind stable facades: `src/game/sim/worldPresets.js`, `src/game/sim/mapspec.js`, and `src/game/sim/worldgen.js` now re-export dedicated internal modules instead of owning the full implementations inline.
- Sim-layer dedupe cleanup landed: duplicate founder 8-neighbor connectivity logic was consolidated into `src/game/sim/grid/index.js` and reused by both foundation eligibility and phase-gate checks.
- Slice B MapSpec wiring is now active.
- Kernel input hardening now blocks non-serializable `SET_MAPSPEC` payloads, rejects cyclic map inputs fail-closed, and keeps invalid `SET_SIZE` dimensions out of committed state.
- Kernel manifest validation now fails closed when a `simGate` manifest is passed without `domainPatchGate`, preventing contract-manifest miswiring on runtime store boot.
- Product SoT was moved to the v1.1 RTS basis in `docs/PRODUCT.md`.
- Architecture SoT now states the dual rule: contracts and product docs stay truth, traceability stays derived.
- Action lifecycle metadata exists for every contract action.
- `SET_MAPSPEC` now has reducer wiring and no longer behaves as a scaffold no-op.
- `GEN_WORLD` now compiles from `map.spec` when MapSpec is active and syncs legacy preset runs into the same map snapshot.
- `SET_MAPSPEC` and `SET_MAP_TILE` now have active UI dispatch sources and dedicated dispatch-source regression guards.
- Builder pipeline now keeps world mutation behind `GEN_WORLD`; `SET_MAPSPEC` and `SET_MAP_TILE` only compile/sync map/meta state.
- Slice C visual baseline upgraded to 0.9.0: Implemented minimal RTS layout. The top-bar is completely removed. A minimal sidebar (`ui.stats.js`) exclusively displays necessary RTS statistics alongside the active canvas grid.
- String extraction retained: `UI_STRINGS` in `ui.constants.js` continues to serve all feedback messages.
- Module separation restored: `ui.input.js`, `ui.builder.js`, `ui.stats.js` and `ui.orders.js` form a clean layer.
- Version bump to 0.9.0 finalized.
- Slice A contract scaffold test exists but is currently being migrated to enforce the DROP_LINE policy for Phase-0/PLACE_CORE removal.
- Slice B MapSpec test was added for deterministic compile + world boot.
- Longrun evidence budget now has explicit headroom at `300_000 ms`.
- Evidence runner now logs verification registry state as `registryStatus=` instead of the ambiguous `status=`.
- LLM-Gates verlangen ab jetzt vor jedem Commit aktualisierte Doku inklusive betroffener Stringmatrix-/Inventar-Dateien sowie eine explizite Endpruefung auf Gesamtaktualitaet.
- Slice-Versionierung ist ab jetzt strikt: jeder abgeschlossene Slice erhoeht die Version um `0.0.1`; Teilstufen `a/b/c/d` bleiben reine Dokument-Anhaenge.
- Legacy compatibility code may remain in isolated facades, but it is no longer treated as a target runtime path.
- Dispatch contract hardening update (2026-03-24): premature UI rewires (`WORKER_HARVEST -> QUEUE_WORKER`, `ZONE_PAINT/SPLIT_PLACE -> PLACE_BUILDING`) were rolled back to schema-valid actions (`HARVEST_WORKER`, `SET_ZONE`, `PLACE_SPLIT_CLUSTER`) to remove silent dispatch failures.
- Deprecated `SET_BRUSH` is no longer emitted by the builder dropdown; builder tool changes stay local in UI mode state.
- `src/game/contracts/dataflow.js` dispatch sources now match live runtime paths (including builder actions), removed stale `ui.overlay` entries, and track `ISSUE_MOVE` via `src/game/ui/ui.orders.js`.
- `devtools/evidence-runner.mjs` now boots stores with the runtime manifest object (not module namespace), restoring fail-closed kernel compatibility in evidence runs.
- Evidence registry inventory was synchronized for active tests `tests/test-legacy-zone-compat-routing.mjs` and `tests/test-whole-repo-dispatch-truth.mjs`; `npm run test:quick` and `npm test` now pass with `AUDIT_OK ... warnings=0`.

## Verified Current Truth
- `src/game/contracts/manifest.js` exports `actionLifecycle` alongside schema, matrix, gate and dataflow.
- `src/game/runtime/index.js` is now the canonical reducer/sim-step entry instead of `src/project/project.logic.js`.
- `src/game/contracts/actionSchema.js` now hardens `SET_MAPSPEC` to an explicit JSON-safe field set instead of `allowUnknown`.
- `src/kernel/store/signature.js`, `src/kernel/store/createStore.js`, and `src/kernel/validation/validateState.js` now fail closed on non-serializable or circular values instead of collapsing them to `null`.
- `src/game/manifest.js` now binds gate validation through `runtimeManifest.domainPatchGate`; module-namespace named gate exports are no longer the authority path.
- `src/game/contracts/dataflow.js` exposes lifecycle metadata and planned writes per action.
- `src/game/contracts/actionSchema.js` now contains Slice A RTS scaffold actions plus the live `SET_MAP_TILE` builder action.
- `src/game/contracts/mutationMatrix.js` now allows `GEN_WORLD` to synchronize `map` state, grid dimensions, lineage ids, physics, and the world/sim payload.
- `src/game/contracts/stateSchema.js` now tracks the active migration slice as `slice_b_mapspec`.
- `src/game/contracts/stateSchema.js` and `src/game/contracts/simGate.js` still carry `patternCatalog` and `patternBonuses`; removal remains open until Gameplay migration completes.
- `src/game/contracts/simGate.js` allows future-safe world registries such as `cores`, `buildings`, `workers`, `fighters`, `belts` and `powerLines`.
- `src/game/sim/mapspec.js` now provides deterministic `validate -> compile` helpers for Slice B.
- `src/kernel/store/persistence.js` now persists `map` together with `meta` in the default web driver while still stripping `world` and `sim`.
- `src/game/ui/ui.model.js` now reads presentation labels from `src/game/viewmodel/advisorLabels.js` instead of importing Dev-LLM modules.
- `src/game/ui/ui.lage.js` no longer imports `src/game/sim/foundationEligibility.js` directly; the runtime boundary now owns that read selector.
- `src/game/render/fogOfWar.js` now contains render-only fog logic; advisor fog shaping moved into `src/game/viewmodel/fogIntel.js`.
- `src/game/sim/reducer/index.js` now re-exports `shouldAdvanceSimulation` while consuming extracted gate and order command modules instead of defining them inline.
- `src/game/sim/reducer/index.js` now delegates active order execution through `src/game/runtime/processActiveOrderRuntime.js` while keeping the runtime/public export surface stable.
- `src/game/runtime/stateCounts.js` now owns shared role/mask counting helpers used by both `src/game/sim/reducer/index.js` and `src/game/sim/reducer/winConditions.js`.
- `src/game/runtime/infraRuntime.js` now owns shared infra staging helpers used by `src/game/sim/reducer/index.js` for candidate-mask cloning and committed-anchor checks.
- `src/game/sim/world/presetCatalog.js`, `src/game/sim/world/presetRuntime.js`, `src/game/sim/world/generationRuntime.js`, and `src/game/sim/mapspec/runtime.js` now own the moved preset/worldgen/MapSpec logic while the old top-level sim paths remain stable facades.
- `src/game/sim/grid/index.js` now owns shared 8-neighbor founder connectivity checks used by `src/game/runtime/foundationEligibility.js` and `src/game/sim/gates/phaseGates.js`.
- `tests/test-active-order-runtime.mjs` now hardens blocked, wait, harvest-progress, and harvest-complete branches for the extracted active-order runtime.

## Traceability Added
- `docs/traceability/rebuild-preparation-inventory.md`
- `docs/traceability/rebuild-string-matrix.md`

Both files## Slice C Minimal UI Runtime (Minimal RTS Layout)
- UI runtime uses a modular structure: `ui.js`, `ui.input.js`, `ui.builder.js`, `ui.orders.js`, `ui.stats.js`, and `ui.constants.js`.
- The interface is strictly divided into two areas: a minimal left sidebar for essential RTS metrics (`ui.stats.js`) and the main interaction canvas.
- Top bars, headers, and floating panels are completely removed.
- Interaction on the grid remains 100% canvas-based. All feedback strings are statically defined in `ui.constants.js` (`UI_STRINGS`). names may exist before reducer wiring, but they must stay no-op safe until implemented.

## Next Work Block
1. Continue Slice C by keeping the `PLACE_WORKER` path and evidence guards current as the slice closes out.
2. Expand Map Builder from current field/zone overrides to richer product tile semantics only after contract and worldgen support exists.
3. Preserve the longrun headroom policy and runner wording when additional regression slots are added.
4. Keep the hardening quick-suite current when future slices add new contract entry points or persistence surfaces.

## Atomare Test-TODO (fix, MVP unveraendert)
1. `todo.slice_b.dispatch_sources` (`done 2026-03-19`)
 Erfuellt: `SET_MAPSPEC` und `SET_MAP_TILE` haben aktive UI-Dispatch-Quellen, `dataflow` ist befuellt, Regressionstests vorhanden.
2. `todo.slice_b.builder_pipeline` (`done 2026-03-19`)
 Erfuellt: Builder-Flow laeuft ueber `MapSpec -> compile -> GEN_WORLD`; direkte Weltmutation ist aus `SET_MAPSPEC`/`SET_MAP_TILE` entfernt.
3. `todo.slice_c.phase0_replacement` (`in progress`)
Done wenn die tote Phase-0/PLACE_CORE-Linie aus aktiven Tests, Devtools und SoT-/Traceability-Doku entfernt ist und nur noch als historische Migration referenziert wird.
4. `todo.truth.regression_wrap`
Done wenn nach jedem Slice der wrapped Regression-Run wieder `evidence_match` liefert und `output/current-truth.json` auf denselben Slice zeigt.

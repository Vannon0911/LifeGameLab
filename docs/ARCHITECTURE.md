# ARCHITECTURE

**APP_VERSION:** 0.8.6

## SoT Rule
- `src/game/contracts/manifest.js` stays the executable contract Source of Truth.
- `docs/PRODUCT.md` stays the product Source of Truth.
- `docs/traceability/*` stays derived evidence only.

## Architecture Core
- Manifest-first stays active.
- State updates stay patch-only.
- Kernel stays the only write authority for gameplay state.
- UI and renderer stay read-only against gameplay state.
- No nondeterministic entropy such as `Math.random()` or `Date.now()` is allowed in reducer or sim step.

## Canonical Modules
- `src/kernel/*`: deterministic kernel, patching, persistence, RNG and validation.
- `src/game/contracts/*`: state, action, mutation, gate, lifecycle and shared runtime identifiers.
- `src/game/runtime/*`: canonical gameplay runtime entrypoints for reducer and sim-step wiring.
- `src/game/sim/*`: active legacy runtime plus reusable deterministic algorithms.
- `src/game/render/*`: canonical renderer and worker renderer.
- `src/game/ui/*`: current UI shell and dispatch-only runtime interaction.
- `src/game/viewmodel/*`: read-only gameplay presentation labels and UI-derived view helpers.
- `src/app/*`: boot, runtime loop and crash surfaces.
- `tools/llm/*`: dev-only LLM adapters, read models and gate tooling. Runtime code must not import them.

## Current Cleanup Slice
- Foundation eligibility now belongs to `src/game/runtime/foundationEligibility.js`; `src/game/sim/foundationEligibility.js` is compatibility-only.
- Fog read-model shaping now belongs to `src/game/viewmodel/fogIntel.js`; `src/game/render/fogOfWar.js` is render-only again.
- Lage-panel read helpers now belong to `src/game/viewmodel/lageStats.js` instead of being embedded inside the UI renderer.
- Reducer phase checks now belong to `src/game/sim/gates/phaseGates.js`; the reducer consumes them instead of owning phase gating inline.
- Worker order parsing and patch builders now belong to `src/game/sim/commands/orderCommands.js`; reducer order handling stays behaviorally unchanged.
- Grid and mask primitives now belong to `src/game/sim/grid/index.js`; reducer placement and visibility logic consumes them instead of defining adjacency helpers inline.
- Active worker order execution now belongs to `src/game/runtime/processActiveOrderRuntime.js`, with movement/navigation support in `src/game/runtime/orderNavigation.js`; `simStepPatch` delegates instead of owning the state machine inline.
- Shared alive/role/mask counting helpers now belong to `src/game/runtime/stateCounts.js`; reducer and win-condition code consume the same counting logic instead of drifting in parallel.
- Infra candidate-mask cloning and committed-anchor checks now belong to `src/game/runtime/infraRuntime.js`; reducer infra-path setup consumes that runtime helper instead of owning the infra staging helpers inline.
- `src/game/sim/worldPresets.js`, `src/game/sim/mapspec.js`, and `src/game/sim/worldgen.js` now act as stable public facades; preset catalog/runtime, MapSpec compile logic, and world generation internals live behind them in dedicated submodules.
- Founder connectivity checks are now consolidated in `src/game/sim/grid/index.js` (`areIndicesConnected8`) and consumed by both runtime foundation eligibility and phase gates, removing duplicate 8-neighbor connectivity logic.

## Slice B MapSpec Baseline
- Legacy worker-RTS runtime is still present and remains bootable.
- MapSpec compile wiring is now active without deleting live legacy flows.
- Action lifecycle metadata now marks every action as `stable`, `rename`, `deprecated` or `new_slice_a`.
- `SET_MAPSPEC` and `SET_MAP_TILE` are now active reducer paths; the remaining RTS placeholders stay no-op until their slices land.
- Replacement planning is machine-readable in contracts and human-readable in `docs/traceability/`.

## Slice C Minimal UI Runtime (Minimal RTS Layout)
- UI runtime uses a modular structure: `ui.js`, `ui.input.js`, `ui.builder.js`, `ui.orders.js`, `ui.stats.js`, and `ui.constants.js`.
- The interface is strictly divided into two areas: a minimal left sidebar for essential RTS metrics (`ui.stats.js`) and the main interaction canvas.
- Top bars, headers, and floating panels are completely removed.
- Interaction on the grid remains 100% canvas-based. All feedback strings are statically defined in `ui.constants.js` (`UI_STRINGS`).

## Slice C Builder Persistence
- Default web persistence now keeps `map` alongside `meta`; `world` and `sim` still reset on reload.
- Builder `tilePlan` survives reload and is re-applied only through the normal `GEN_WORLD` compile path.
- Builder-specific regression coverage now includes phase gating, `SET_MAP_TILE` roundtrip, and persisted reload recovery.

## Runtime Truth At Head
- Boot now imports directly from `src/game/manifest.js`, `src/game/runtime/index.js`, `src/game/render/renderer.js`, and `src/game/ui/ui.js`.
- Operative reducer path remains `src/game/sim/reducer/index.js`.
- `src/game/sim/reducer.js` remains the compatibility facade.
- `src/game/runtime/index.js` remains the stable public sim-step surface even though active order execution now delegates into runtime helper modules.
- `src/game/sim/worldPresets.js`, `src/game/sim/mapspec.js`, and `src/game/sim/worldgen.js` remain the stable path-pinned surfaces consumed by runtime and tests.
- Boot still dispatches `GEN_WORLD`, but world boot now compiles through `map.spec`.
- Renderer orchestration in `src/app/main.js` and `src/game/render/renderer.js` remains canonical and reusable.
- Top-level `map` state is now a live deterministic compile input, not just scaffold.
- Legacy preset actions now sync through the same MapSpec compile path.
- Builder tile edits now follow the same deterministic `SET_MAP_TILE -> GEN_WORLD` compile path as full MapSpec updates.

## Contract Truth At Head
- `actionSchema` contains both live legacy actions and active Slice B MapSpec actions.
- `PLACE_CELL` has been retired from the active contract surface; `PLACE_WORKER` now carries the founder-placement runtime path.
- `patternCatalog` and `patternBonuses` are no longer part of the live state schema or sim gate; `mutatorDraft` is the current mutation draft surface.
- `mutationMatrix` remains authoritative for allowed writes.
- `simGate` remains authoritative for `/world/*` and `/sim/*` patch validation.
- `dataflow` exposes dispatch sources plus lifecycle and planned writes.
- `actionLifecycle` is the canonical replacement ledger for action migration.

## Reuse Policy
- Reuse generic deterministic algorithms.
- Rewrite product vocabulary and gameplay surfaces.
- Delete only after replacement wiring, reducer migration and test migration are complete.

High-value reuse candidates:
- `src/game/sim/cellPatterns.js`
- `src/game/sim/patterns.js`
- `src/game/sim/worldAi.js`
- `src/game/sim/reducer/winConditions.js`
- `src/game/render/renderer.js`
- `src/app/main.js`

## Test And Gate Basis
- Entry and preflight remain mandatory before writes.
- Determinism and replay tests remain the hard truth line.
- New migration tests must prove scaffold actions are safe before reducer wiring lands.
- Legacy paths may be removed only after a test proves the replacement path has assumed the responsibility.

## Repo Structure (3-Layer)

### Layer 1: KERNEL (Deterministic Core)
- `src/kernel/`: deterministic store, patching, validation, persistence, RNG.

### Layer 2: AGME (Game Runtime)
- `src/app/`: bootstrap and runtime orchestration.
- `src/kernel/`: deterministic engine and state-write authority.
- `src/game/`: runtime gameplay, manifest, contracts, renderer, UI and viewmodels.
- `tests/`: determinism, contract and migration guards.
- `tools/`: test runners, evidence tooling and dev-only LLM helpers.
- `docs/`: SoT docs and derived traceability.

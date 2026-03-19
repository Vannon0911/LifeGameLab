# ARCHITECTURE

**APP_VERSION:** 0.8.1

## SoT Rule
- `src/project/contract/manifest.js` stays the executable contract Source of Truth.
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
- `src/project/contract/*`: state, action, mutation, gate, lifecycle and dataflow contracts.
- `src/game/contracts/*`: product-facing enums and shared identifiers.
- `src/game/sim/*`: active legacy runtime plus reusable deterministic algorithms.
- `src/game/render/*`: canonical renderer and worker renderer.
- `src/game/ui/*`: current adapter shell and legacy-facing wiring.
- `src/app/*`: boot, runtime loop and crash surfaces.

## Slice B MapSpec Baseline
- Legacy cell-RTS runtime is still present and remains bootable.
- MapSpec compile wiring is now active without deleting live legacy flows.
- Action lifecycle metadata now marks every action as `stable`, `rename`, `deprecated` or `new_slice_a`.
- `SET_MAPSPEC` is now an active reducer path; the remaining RTS placeholders stay no-op until their slices land.
- Replacement planning is machine-readable in contracts and human-readable in `docs/traceability/`.

## Runtime Truth At Head
- Operative reducer path remains `src/game/sim/reducer/index.js`.
- `src/game/sim/reducer.js` remains the compatibility facade.
- Boot still dispatches `GEN_WORLD`, but world boot now compiles through `map.spec`.
- Renderer orchestration in `src/app/main.js` and `src/game/render/renderer.js` remains canonical and reusable.
- Top-level `map` state is now a live deterministic compile input, not just scaffold.
- Legacy preset actions now sync through the same MapSpec compile path.

## Contract Truth At Head
- `actionSchema` contains both live legacy actions and active Slice B MapSpec actions.
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

## Repo Structure
- `src/app/`: bootstrap and runtime orchestration.
- `src/core/`: compatibility kernel facade.
- `src/game/`: runtime gameplay, renderer and UI.
- `src/project/`: manifest, contracts and adapters.
- `tests/`: determinism, contract and migration guards.
- `tools/`: test runners and evidence tooling.
- `docs/`: SoT docs and derived traceability.

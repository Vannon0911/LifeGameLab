# STATUS - Current Head

## Snapshot (2026-03-19)
- Slice B MapSpec wiring is now active.
- Kernel input hardening now blocks non-serializable `SET_MAPSPEC` payloads, rejects cyclic map inputs fail-closed, and keeps invalid `SET_SIZE` dimensions out of committed state.
- Product SoT was moved to the v1.1 RTS basis in `docs/PRODUCT.md`.
- Architecture SoT now states the dual rule: contracts and product docs stay truth, traceability stays derived.
- Action lifecycle metadata exists for every contract action.
- `SET_MAPSPEC` now has reducer wiring and no longer behaves as a scaffold no-op.
- `GEN_WORLD` now compiles from `map.spec` when MapSpec is active and syncs legacy preset runs into the same map snapshot.
- Slice A contract scaffold test was added and passes.
- Slice B MapSpec test was added for deterministic compile + world boot.
- Longrun evidence budget now has explicit headroom at `300_000 ms`.
- Evidence runner now logs verification registry state as `registryStatus=` instead of the ambiguous `status=`.
- Legacy runtime still remains active and intentionally untouched as live fallback.

## Verified Current Truth
- `src/project/contract/manifest.js` exports `actionLifecycle` alongside schema, matrix, gate and dataflow.
- `src/project/contract/actionSchema.js` now hardens `SET_MAPSPEC` to an explicit JSON-safe field set instead of `allowUnknown`.
- `src/kernel/store/signature.js`, `src/kernel/store/createStore.js`, and `src/kernel/validation/validateState.js` now fail closed on non-serializable or circular values instead of collapsing them to `null`.
- `src/project/project.manifest.js` now exposes `domainPatchGate` as a named export so module-namespace callers hit the same gate path as the app runtime.
- `src/project/contract/dataflow.js` exposes lifecycle metadata and planned writes per action.
- `src/project/contract/actionSchema.js` now contains Slice A RTS scaffold actions.
- `src/project/contract/mutationMatrix.js` now allows `GEN_WORLD` to synchronize `map` state and grid dimensions.
- `src/project/contract/stateSchema.js` now tracks the active migration slice as `slice_b_mapspec`.
- `src/project/contract/simGate.js` allows future-safe world registries such as `cores`, `buildings`, `workers`, `fighters`, `belts` and `powerLines`.
- `src/game/sim/mapspec.js` now provides deterministic `validate -> compile` helpers for Slice B.

## Traceability Added
- `docs/traceability/rebuild-preparation-inventory.md`
- `docs/traceability/rebuild-string-matrix.md`

Both files are derived planning evidence only and must not override SoT docs or contracts.

## Guardrails
- Delete only after replacement.
- No legacy action may be removed while dispatch sources, reducer cases or tests still depend on it.
- New action names may exist before reducer wiring, but they must stay no-op safe until implemented.

## Next Work Block
1. Continue Slice B by wiring MapSpec dispatch sources into the UI and builder tooling.
2. Keep legacy founder and zone flows alive until their replacements have reducer wiring and passing tests.
3. Preserve the longrun headroom policy and runner wording when additional regression slots are added.
4. Keep the new hardening quick-suite current when future slices add new contract entry points or persistence surfaces.

## Atomare Test-TODO (fix, MVP unveraendert)
1. `todo.slice_b.dispatch_sources`
Done wenn `SET_MAPSPEC` aktive Dispatch-Sources in UI/Builder hat, `dataflow` nicht mehr leer ist und ein gezielter UI-/Builder-Test gruen ist.
2. `todo.slice_b.builder_pipeline`
Done wenn der interne Builder nur noch `MapSpec -> validate -> compile -> GEN_WORLD` benutzt und keine direkte Weltmutation mehr benoetigt.
3. `todo.slice_c.phase0_replacement`
Done wenn `CONFIRM_FOUNDATION`, `CONFIRM_CORE_ZONE`, `PLACE_CELL` und `SET_BRUSH` durch den Phase-0-Ersatz technisch abgeloest sind und ihre Removal-Gates geschlossen werden koennen.
4. `todo.truth.regression_wrap`
Done wenn nach jedem Slice der wrapped Regression-Run wieder `evidence_match` liefert und `output/current-truth.json` auf denselben Slice zeigt.

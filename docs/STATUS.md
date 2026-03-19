# STATUS - Current Head

## Snapshot (2026-03-19)
- Slice A migration scaffolding is now active.
- Product SoT was moved to the v1.1 RTS basis in `docs/PRODUCT.md`.
- Architecture SoT now states the dual rule: contracts and product docs stay truth, traceability stays derived.
- Action lifecycle metadata exists for every contract action.
- New RTS scaffold actions exist in contracts without reducer wiring yet.
- New top-level `map` scaffold exists for upcoming MapSpec work.
- Slice A contract scaffold test was added and passes.
- Legacy runtime still remains active and intentionally untouched as live fallback.

## Verified Current Truth
- `src/project/contract/manifest.js` exports `actionLifecycle` alongside schema, matrix, gate and dataflow.
- `src/project/contract/dataflow.js` exposes lifecycle metadata and planned writes per action.
- `src/project/contract/actionSchema.js` now contains Slice A RTS scaffold actions.
- `src/project/contract/mutationMatrix.js` reserves the contract surfaces for those scaffold actions.
- `src/project/contract/stateSchema.js` now contains migration scaffold state for `map`, `selectedEntity`, `mutatorDraft` and Phase 0 counters.
- `src/project/contract/simGate.js` allows future-safe world registries such as `cores`, `buildings`, `workers`, `fighters`, `belts` and `powerLines`.

## Traceability Added
- `docs/traceability/rebuild-preparation-inventory.md`
- `docs/traceability/rebuild-string-matrix.md`

Both files are derived planning evidence only and must not override SoT docs or contracts.

## Guardrails
- Delete only after replacement.
- No legacy action may be removed while dispatch sources, reducer cases or tests still depend on it.
- New action names may exist before reducer wiring, but they must stay no-op safe until implemented.

## Next Work Block
1. Start Slice B with `MapSpec -> validate -> compile -> GEN_WORLD`.
2. Keep legacy founder and zone flows alive until their replacements have reducer wiring and passing tests.
3. Re-run the wrapped regression evidence session after the timeout wrapper is inspected, even though the remaining tests passed individually.

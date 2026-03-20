# STATUS - Current Head

## Snapshot (2026-03-20)
- Slice B MapSpec wiring is now active.
- Kernel input hardening now blocks non-serializable `SET_MAPSPEC` payloads, rejects cyclic map inputs fail-closed, and keeps invalid `SET_SIZE` dimensions out of committed state.
- Product SoT was moved to the v1.1 RTS basis in `docs/PRODUCT.md`.
- Architecture SoT now states the dual rule: contracts and product docs stay truth, traceability stays derived.
- Action lifecycle metadata exists for every contract action.
- `SET_MAPSPEC` now has reducer wiring and no longer behaves as a scaffold no-op.
- `GEN_WORLD` now compiles from `map.spec` when MapSpec is active and syncs legacy preset runs into the same map snapshot.
- `SET_MAPSPEC` and `SET_MAP_TILE` now have active UI dispatch sources and dedicated dispatch-source regression guards.
- Builder pipeline now keeps world mutation behind `GEN_WORLD`; `SET_MAPSPEC`, `SET_MAP_TILE`, and `SET_WORLD_PRESET` only compile/sync map/meta state.
- Slice C visual baseline is now live: UI layout/input modules are mounted, canvas click placement is regression-tested, and tile object placeholders render in-world.
- Slice C minimal runtime UI is now active: panel stack removed, direct canvas placement flow is live, and movement is paced at 1 tile per second with purely visual interpolation.
- Slice C worker hardening landed: legacy founder placement now routes through `PLACE_WORKER`, `PLACE_CELL` is gone from active codepaths, and blocked move orders now wait/retry instead of hard-aborting.
- Map Builder now has a visible panel, tile palette, status feedback, and cursor highlight instead of relying on a blind `M` toggle only.
- Default web persistence now keeps `map` state, so builder `tilePlan` no longer disappears on reload while `world` and `sim` still regenerate safely.
- Builder regression coverage now includes `RUN_PHASE.MAP_BUILDER`, `SET_MAP_TILE` -> `GEN_WORLD` roundtrip, and persisted reload survival for `tilePlan`.
- Terminology migration advanced: product/architecture/entry docs now use `worker` as canonical runtime wording; legacy `cell` naming remains compatibility-only for action IDs.
- Slice A contract scaffold test was added and passes.
- Slice B MapSpec test was added for deterministic compile + world boot.
- Longrun evidence budget now has explicit headroom at `300_000 ms`.
- Evidence runner now logs verification registry state as `registryStatus=` instead of the ambiguous `status=`.
- LLM-Gates verlangen ab jetzt vor jedem Commit aktualisierte Doku inklusive betroffener Stringmatrix-/Inventar-Dateien sowie eine explizite Endpruefung auf Gesamtaktualitaet.
- Slice-Versionierung ist ab jetzt strikt: jeder abgeschlossene Slice erhoeht die Version um `0.0.1`; Teilstufen `a/b/c/d` bleiben reine Dokument-Anhaenge.
- Legacy runtime still remains active and intentionally untouched as live fallback.

## Verified Current Truth
- `src/project/contract/manifest.js` exports `actionLifecycle` alongside schema, matrix, gate and dataflow.
- `src/project/contract/actionSchema.js` now hardens `SET_MAPSPEC` to an explicit JSON-safe field set instead of `allowUnknown`.
- `src/kernel/store/signature.js`, `src/kernel/store/createStore.js`, and `src/kernel/validation/validateState.js` now fail closed on non-serializable or circular values instead of collapsing them to `null`.
- `src/project/project.manifest.js` now exposes `domainPatchGate` as a named export so module-namespace callers hit the same gate path as the app runtime.
- `src/project/contract/dataflow.js` exposes lifecycle metadata and planned writes per action.
- `src/project/contract/actionSchema.js` now contains Slice A RTS scaffold actions plus the live `SET_MAP_TILE` builder action.
- `src/project/contract/mutationMatrix.js` now allows `GEN_WORLD` to synchronize `map` state, grid dimensions, lineage ids, physics, and the world/sim payload.
- `src/project/contract/stateSchema.js` now tracks the active migration slice as `slice_b_mapspec`.
- `src/project/contract/stateSchema.js` and `src/project/contract/simGate.js` no longer carry `patternCatalog` or `patternBonuses`; the live mutation surface is now `mutatorDraft` plus the runtime registries listed in `simGate`.
- `src/project/contract/simGate.js` allows future-safe world registries such as `cores`, `buildings`, `workers`, `fighters`, `belts` and `powerLines`.
- `src/game/sim/mapspec.js` now provides deterministic `validate -> compile` helpers for Slice B.
- `src/kernel/store/persistence.js` now persists `map` together with `meta` in the default web driver while still stripping `world` and `sim`.

## Traceability Added
- `docs/traceability/rebuild-preparation-inventory.md`
- `docs/traceability/rebuild-string-matrix.md`

Both files are derived planning evidence only and must not override SoT docs or contracts.

## Guardrails
- Delete only after replacement.
- No legacy action may be removed while dispatch sources, reducer cases or tests still depend on it.
- New action names may exist before reducer wiring, but they must stay no-op safe until implemented.

## Next Work Block
1. Continue Slice C by keeping the `PLACE_WORKER` path and evidence guards current as the slice closes out.
2. Expand Map Builder from current field/zone overrides to richer product tile semantics only after contract and worldgen support exists.
3. Preserve the longrun headroom policy and runner wording when additional regression slots are added.
4. Keep the hardening quick-suite current when future slices add new contract entry points or persistence surfaces.

## Atomare Test-TODO (fix, MVP unveraendert)
1. `todo.slice_b.dispatch_sources` (`done 2026-03-19`)
 Erfuellt: `SET_MAPSPEC` und `SET_MAP_TILE` haben aktive UI-Dispatch-Quellen, `dataflow` ist befuellt, Regressionstests vorhanden.
2. `todo.slice_b.builder_pipeline` (`done 2026-03-19`)
 Erfuellt: Builder-Flow laeuft ueber `MapSpec -> compile -> GEN_WORLD`; direkte Weltmutation ist aus `SET_MAPSPEC`/`SET_MAP_TILE`/`SET_WORLD_PRESET` entfernt.
3. `todo.slice_c.phase0_replacement`
Done wenn `CONFIRM_FOUNDATION`, `CONFIRM_CORE_ZONE`, `PLACE_WORKER` und `SET_BRUSH` durch den Phase-0-Ersatz technisch abgeloest sind und ihre Removal-Gates geschlossen werden koennen.
4. `todo.truth.regression_wrap`
Done wenn nach jedem Slice der wrapped Regression-Run wieder `evidence_match` liefert und `output/current-truth.json` auf denselben Slice zeigt.

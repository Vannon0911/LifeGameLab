# LIFEXLAB — SYSTEM ARCHITECTURE SNAPSHOT
**Datum:** 2026-03-14 | **Version:** 14.1 | **APP_VERSION:** 2.3.0 (Sandbox Build) | **Status:** TEILVERIFIZIERT · Kern-/Doku-Gates grün, Vollsuite aktuell rot

## Architektur-Mandat

- einziger Write-Entry: `store.dispatch(action)`
- Kernel in `src/core/kernel/*`
- Runtime in `src/core/runtime/*`
- Simulation in `src/game/sim/*`
- Renderer in `src/game/render/*`
- UI in `src/game/ui/*`
- projektseitige Integration in `src/project/*`

## Contract-Kerne

- `src/project/project.manifest.js` definiert `stateSchema`, `actionSchema`, `mutationMatrix`
- `src/core/kernel/patches.js` erzwingt Write-Gates
- `src/core/kernel/schema.js` erzwingt Sanitizing
- `src/core/kernel/store.js` schützt Determinismus und Dispatch-Pipeline

## Empirische Beweise

- Vollsuite: `npm test` ist aktuell **nicht** grün
- erster Brecher der Vollsuite: `tests/test-faction-metrics.mjs` (`faction-1`: keine lebenden Player-Zellen bei Tick 80)
- Versionskonsistenz: `tests/test-version-traceability.mjs`
- Pfadhygiene: `tests/test-path-hygiene.mjs`
- Dataflow-Doku: `tests/test-manifest-dataflow.mjs`
- Core-Gates: `tests/test-core-gates.mjs`
- Redteam: `tools/redteam-stress-master.mjs`
- operative Doku: nur `docs/`

## Integritäts-Signaturen

- `src/core/kernel/store.js`
- `src/core/kernel/patches.js`
- `src/core/kernel/schema.js`
- `src/core/kernel/rng.js`

## Offene Punkte

- `DOC-01` Snapshot-/Handoff-Stand nur dann wieder auf "verifiziert" setzen, wenn `npm test` erneut grün ist
- `SIM-FAIL-01` `tests/test-faction-metrics.mjs` stabilisieren; derzeit stirbt die Player-Fraktion in mindestens einem Seed bis Tick 80 aus
- `LLM-01` `window.render_game_to_text` und `window.advanceTime` als browsergetriebener Test-Entry ergänzen
- `CORE-01` Win-Conditions für Release-Build reaktivieren
- `PERF-01` activeTiles-Optimierung in `src/game/sim/step.js`
- `RENDER-01` Flow-Lines / Energiefluss visualisieren

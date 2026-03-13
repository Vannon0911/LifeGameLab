# LIFEXLAB — SYSTEM ARCHITECTURE SNAPSHOT
**Datum:** 2026-03-14 | **Version:** 14.0 | **APP_VERSION:** 2.3.0 (Sandbox Build) | **Status:** VERIFIZIERT · 21 Testdateien + Redteam grün

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

- Vollsuite: `npm test`
- Versionskonsistenz: `tests/test-version-traceability.mjs`
- Pfadhygiene: `tests/test-path-hygiene.mjs`
- Redteam: `tools/redteam-stress-master.mjs`
- operative Doku: nur `docs/`

## Integritäts-Signaturen

- `src/core/kernel/store.js`
- `src/core/kernel/patches.js`
- `src/core/kernel/schema.js`
- `src/core/kernel/rng.js`

## Offene Punkte

- `CORE-01` Win-Conditions für Release-Build reaktivieren
- `PERF-01` activeTiles-Optimierung in `src/game/sim/step.js`
- `RENDER-01` Flow-Lines / Energiefluss visualisieren

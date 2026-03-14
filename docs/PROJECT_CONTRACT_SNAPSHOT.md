# LIFEXLAB — SYSTEM ARCHITECTURE SNAPSHOT
**Datum:** 2026-03-14 | **Version:** 14.4 | **APP_VERSION:** 2.3.0 (Sandbox Build) | **Status:** VERIFIZIERT · Vollsuite, Determinismus, Core-Gates und Contract-Hardening grün; Perf-Ziel aus Implementierungsplan noch offen

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
- `src/game/contracts/ids.js` ist Source-of-Truth für kritische String-IDs (`winMode`, `gameResult`, `goal`, `overlay`, `brushMode`)

## Empirische Beweise

- Vollsuite: `npm test` ist grün, inkl. Redteam
- Determinismus:
  - `tests/test-determinism-long.mjs`
  - `tests/test-determinism-per-tick.mjs`
  - `tests/test-determinism-with-interactions.mjs`
- Versionskonsistenz: `tests/test-version-traceability.mjs`
- Pfadhygiene: `tests/test-path-hygiene.mjs`
- Dataflow-Doku: `tests/test-manifest-dataflow.mjs`
- Dataflow-Contract konkret: `tests/test-dataflow-contract.mjs`
- Core-Gates: `tests/test-core-gates.mjs`
- SIM-Gate: `tests/test-sim-gate.mjs`
- String-Contract: `tests/test-string-contract.mjs`
- Wrapper-Ban: `tests/test-wrapper-ban.mjs`
- Browser-/Strategie-Entry: `tests/test-ui-strategy-contract.mjs`
- Split-Sicherheitsgate: `tests/test-split-security-gate.mjs`
- Redteam: `tools/redteam-stress-master.mjs`
- operative Doku: nur `docs/`
- Browser-Abnahme Rework v3:
  - Mobile-Sheet + Dock-Wechsel verifiziert
  - fokussierter Evolution-Flow verifiziert
  - Desktop-Statusraum nach 5s Lauf verifiziert
  - `window.render_game_to_text` liefert `risk`, `mission`, `structure`

## Integritäts-Signaturen

- `src/core/kernel/store.js`
- `src/core/kernel/patches.js`
- `src/core/kernel/schema.js`
- `src/core/kernel/rng.js`

## Offene Punkte

- `PERF-01` Ziel aus Implementierungsplan noch offen: `>=10%` Profilverbesserung je Fall aktuell nicht erreicht (`node tools/profile-core.mjs`: `4.154 / 5.481 / 9.003 ms_per_tick` für `32² / 64² / 96²`)
- `PERF-02` Browser-Benchmark (Main/Worker) erneut messen und dokumentieren
- `RENDER-01` Flow-Lines / Energiefluss visualisieren
- `ARCH-01` weiteren Reducer-Abbau nach `playerActions.js` fortsetzen, damit `src/game/sim/reducer.js` kein Rest-Monolith bleibt
- `UX-01` Missions- und Directive-Feedback weiter verdichten, damit Stage- und Tech-Unlocks noch härter im Canvas spürbar werden

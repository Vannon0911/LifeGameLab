# ARCHITECTURE

**APP_VERSION:** 2.6.0

## Architektur-Kern
- Manifest-first bleibt aktiv.
- State-Updates bleiben patch-only.
- Kernel bleibt einzige Schreibinstanz fuer Gameplay-State.
- UI und Renderer bleiben read-only gegenueber Gameplay-State.
- Keine Entropiequellen wie `Math.random()` oder `Date.now()` in Reducer/SimStep.

## Kanonische Module
- `src/core/kernel/*`: deterministischer Kernel, Patches, Persistenz, RNG
- `src/project/contract/*`: State-, Action-, Mutation-, Gate- und Dataflow-Vertrag
- `src/game/sim/*`: Simulationslogik, Worldgen, Step-Pipeline, Reducer
- `src/game/render/*`: kanonischer Renderer plus Worker
- `src/game/ui/*`: UI-Logik, Read-Model, DOM- und Feedback-Helfer
- `src/app/*`: Boot, Public API, Runtime-Berichte

## Laufende Wahrheiten
- Operativer Reducerpfad bleibt `src/game/sim/reducer/index.js`.
- `src/game/sim/reducer.js` bleibt nur Compatibility-Fassade.
- Deterministisches Advisor-/Read-Model ist gemeinsame Truth fuer HUD, Textdiagnose und Statuspanel.
- Main-Run-Renderpfad bleibt `combined`.
- Legacy-/Diagnose-Overlays und Roh-Brushes sind Labor-only.

## Contract-Status
- Thin-Facades fuer `project.manifest.js`, `sim.js` und `reducer.js` aktiv
- Tick-Orchestrierung in `step.js`, Phasenlogik in `stepPhases.js`, Runtime-Helfer in `stepRuntime.js`
- Reducer-Control-Actions in `reducer/controlActions.js`
- Public Browser API in `src/app/runtime/publicApi.js`
- Runtime-Helfer in `worldStateLog.js`, `reportUtils.js`, `bootStatus.js`
- Phase-E-Felder aktiv: `world.zoneRole`, `world.zoneId`, `world.zoneMeta`
- Phase-E-Pattern-State aktiv: `sim.patternCatalog`, `sim.patternBonuses`

## Test- Und Gate-Basis
- `npm test` und `npm run test:quick`: lokale Schnellgates
- `npm run test:truth`: Determinismus-/Truth-Suite
- `npm run test:stress`: Belastungssuite
- `node tests/test-drift-negative-order.mjs`
- `node tests/test-determinism-long.mjs`
- `node tests/test-release-candidate-integrity.mjs`

## Performance- Und Debug-Regeln
- Performance bleibt offen, aber erst nach gruener Vollsuite optimieren.
- Playwright-Debug laeuft ueber `tools/playwright-debug-loop.mjs`.
- Benchmark-/Worker-Checks gehoeren in Labor, nicht in den Main-Run.

## Repo-Struktur
- `src/app/`: Bootstrap und Laufzeit-Hooks
- `src/core/`: Kernel und Runtime-Helfer
- `src/game/`: Sim, Renderer, UI
- `src/project/`: Manifest, Contracts, LLM-Glue
- `tests/`: Gates, Determinismus, Gameplay, Contracts
- `tools/`: Test-Suiten, Debug, Profiling, Stress
- `docs/`: nur vier kanonische Top-Level-Dokumente plus `docs/llm/`

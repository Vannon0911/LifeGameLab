# ARCHITECTURE

**APP_VERSION:** 0.7.3

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
- `src/app/*`: Boot, Runtime-Berichte, Fehlerstatus

## Laufende Wahrheiten
- Operativer Reducerpfad bleibt `src/game/sim/reducer/index.js`.
- `src/game/sim/reducer.js` bleibt nur Compatibility-Fassade.
- Deterministisches Advisor-/Read-Model ist gemeinsame Truth fuer HUD, Textdiagnose und Statuspanel.
- Main-Run-Renderpfad bleibt `combined`.
- Legacy-/Diagnose-Overlays und Roh-Brushes sind Labor-only.
- Repro-Hardening ist fuer W1 als kleiner dispatch-only Proof belegt; weitergehende Bereiche muessen in denselben Stil nachgezogen werden.

## Contract-Status
- Thin-Facades fuer `project.manifest.js`, `sim.js` und `reducer.js` aktiv
- Tick-Orchestrierung in `step.js`, Phasenlogik in `stepPhases.js`, Runtime-Helfer in `stepRuntime.js`
- Reducer-Control-Actions in `reducer/controlActions.js`
- Runtime-Helfer in `worldStateLog.js`, `reportUtils.js`, `bootStatus.js`
- Phase-E-Felder aktiv: `world.zoneRole`, `world.zoneId`, `world.zoneMeta`
- Phase-E-Pattern-State aktiv: `sim.patternCatalog`, `sim.patternBonuses`
- Keine globale Live-Surface fuer Store, Dispatch, Perf oder Textdiagnose. `window.__lifeGameStore`, `window.__worldStateLog`, `window.__lifeGamePerfStats`, `window.render_game_to_text` und `window.advanceTime` sind bewusst entfernt.

## Test- Und Gate-Basis
- Offizieller Einstieg: `node tools/evidence-runner.mjs --suite claims|regression|full`
- Wrapper: `node tools/run-test-suite.mjs <suite>` und `node tools/run-all-tests.mjs --full`
- Offizielle W1-Claims sind dispatch-only und deterministisch replay-pflichtig.
- Aktive Regressionen:
  - `node tests/test-contract-no-bypass.mjs`
  - `node tests/test-deterministic-genesis.mjs`
  - `node tests/test-llm-contract.mjs`

## Performance- Und Debug-Regeln
- Performance bleibt offen, aber erst nach gruener Vollsuite optimieren.
- `tools/playwright-debug-loop.mjs` ist deaktiviert, weil globale Browser-Debug-Hooks bewusst entfernt wurden.
- Benchmark-/Worker-Checks gehoeren in Labor, nicht in den Main-Run.

## Repo-Struktur
- `src/app/`: Bootstrap und Laufzeit-Hooks
- `src/core/`: Kernel und Runtime-Helfer
- `src/game/`: Sim, Renderer, UI
- `src/project/`: Manifest, Contracts, LLM-Glue
- `tests/`: minimale Determinismus-, Bypass- und LLM-Gate-Beweise
- `tools/`: Test-Suiten, Debug, Profiling, Stress
- `docs/`: nur vier kanonische Top-Level-Dokumente plus `docs/llm/`

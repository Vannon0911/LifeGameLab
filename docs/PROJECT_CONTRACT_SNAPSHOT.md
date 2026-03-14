# PROJECT_CONTRACT_SNAPSHOT

**APP_VERSION:** 2.4.0

## Contract-Status
- Manifest-first aktiv
- Patch-only State-Updates aktiv
- Kernel-Isolation aktiv
- Thin-Facades fuer `project.manifest.js`, `sim.js`, `reducer.js` aktiv
- Tick-Orchestrierung in `step.js`, Phasenlogik in `stepPhases.js`
- Tick-Helfer aus `step.js` in `stepRuntime.js` extrahiert (pure, deterministisch)
- Reducer-Control-Actions in `reducer/controlActions.js` extrahiert (pure)
- UI-Klasse in `ui.js`, UI-Read-Model in `ui.model.js`, UI-Konstanten in `ui.constants.js`
- UI-DOM-/Feedback-Helfer in `ui.dom.js` und `ui.feedback.js` extrahiert
- Public Browser API aus `main.js` in `src/app/runtime/publicApi.js` extrahiert (kompatible Hooks bleiben)
- Runtime-Helfer aus `main.js` in `src/app/runtime/worldStateLog.js`, `reportUtils.js`, `bootStatus.js`
- Deterministisches Advisor-Read-Model als gemeinsame Source of Truth fuer `render_game_to_text`, HUD und Statuspanel
- Main-Run-Defaults: Placement Cost standardmaessig an, Global Learning standardmaessig aus, Win-Mode nach Tick 0 fixiert
- Renderer respektiert `meta.activeOverlay` als echte Diagnoseansicht fuer Energie, Toxin, Naehrstoffe, Territorium und Konflikt

## Kernmodule
- `src/project/contract/*`
- `src/project/llm/*`
- `src/game/contracts/ids.js`

## Nachweis-Kommandos
- `node tests/test-core-gates.mjs`
- `node tests/test-sim-gate.mjs`
- `node tests/test-determinism-per-tick.mjs`
- `node tests/test-determinism-with-interactions.mjs`
- `node tests/test-determinism-long.mjs`
- `node tests/test-drift-negative-order.mjs`
- `node tests/test-path-hygiene.mjs`
- `node tools/redteam-stress-master.mjs`
- `npm test`
- `npm run test:quick`
- `npm run test:truth`
- `npm run test:stress`

## Offene Schwerpunkte
- Performance-Profiling und Reduktion von Render-/Sim-Hotspots
- weitere Entmonolithisierung im Sim-Reducer
- visuelle Feedback-Dichte im Gameplay weiter schaerfen
- Hotspot-Messung siehe `docs/PERF_HOTSPOTS.md`

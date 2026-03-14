# PROJECT_CONTRACT_SNAPSHOT

**APP_VERSION:** 2.3.0

## Contract-Status
- Manifest-first aktiv
- Patch-only State-Updates aktiv
- Kernel-Isolation aktiv
- Thin-Facades fuer `project.manifest.js`, `sim.js`, `reducer.js` aktiv
- Tick-Orchestrierung in `step.js`, Phasenlogik in `stepPhases.js`
- UI-Klasse in `ui.js`, UI-Read-Model in `ui.model.js`, UI-Konstanten in `ui.constants.js`
- Public Browser API aus `main.js` in `src/app/runtime/publicApi.js` extrahiert (kompatible Hooks bleiben)

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

## Offene Schwerpunkte
- Performance-Profiling und Reduktion von Render-/Sim-Hotspots
- weitere Entmonolithisierung im Sim-Reducer
- visuelle Feedback-Dichte im Gameplay erhoehen

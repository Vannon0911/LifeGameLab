# PROJECT_CONTRACT_SNAPSHOT

## Contract-Status
- Manifest-first aktiv
- Patch-only State-Updates aktiv
- Kernel-Isolation aktiv
- Thin-Facades fuer `project.manifest.js`, `sim.js`, `reducer.js` aktiv

## Kernmodule
- `src/project/contract/*`
- `src/project/llm/*`
- `src/game/contracts/ids.js`

## Nachweis-Kommandos
- `node tests/test-core-gates.mjs`
- `node tests/test-sim-gate.mjs`
- `node tests/test-determinism-per-tick.mjs`
- `node tests/test-determinism-with-interactions.mjs`
- `node tests/test-path-hygiene.mjs`
- `node tools/redteam-stress-master.mjs`
- `npm test`

## Offene Schwerpunkte
- Performance-Profiling und Reduktion von Render-/Sim-Hotspots
- weitere Entmonolithisierung im Sim-Reducer
- visuelle Feedback-Dichte im Gameplay erhoehen

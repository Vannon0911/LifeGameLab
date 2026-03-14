# LLM_ENTRY — Pflicht-Einstieg

Dieses Projekt ist ein Contract-System. Änderungen ohne Manifest-, Schema- und Mutations-Gates gelten als defekt.

## Pflicht-Lesereihenfolge

1. `src/core/kernel/store.js`
2. `src/core/kernel/patches.js`
3. `src/project/project.manifest.js`
4. `src/core/kernel/schema.js`
5. `src/core/kernel/rng.js`
6. `src/project/project.logic.js`
7. `src/game/sim/reducer.js`
8. `src/game/sim/sim.js`
9. `src/game/sim/worldgen.js`
10. `src/project/renderer.js`
11. `src/game/render/renderer.js`
12. `src/project/ui.js`
13. `src/game/ui/ui.js`
14. `src/app/main.js`

## Harte Regeln

- State-Änderungen nur über `dispatch()` und Patches.
- Renderer und UI schreiben keinen Gameplay-State.
- Simulation bleibt deterministisch: kein `Math.random()`, kein `Date.now()`, keine systemzeitabhängige Logik.
- Neue State-Felder, Actions und Write-Pfade zuerst im Manifest definieren.
- Operative Doku lebt ausschließlich unter `docs/`.
- Tests werden nicht vorschnell abgeschwächt oder enger auf den neuen Code zugeschnitten.
- Wenn ein Test nach einer Änderung fehlschlägt, zuerst Ursachenforschung, reale Contract-Prüfung und alternative Fixes priorisieren.
- Testanpassungen sind nur legitim, wenn der Test nachweislich falsche Annahmen prüft oder Laufzeit-/Tooling-Rauschen statt Produktverhalten misst.

## Strukturhinweise (aktuell)

- `src/project/project.manifest.js` ist eine kompatible Fassade; der aktive Contract lebt in `src/project/contract/*`.
- `src/game/sim/reducer.js` ist ein kompatibler Entry; aktive Implementierung liegt in `src/game/sim/reducer/index.js`.
- `src/game/sim/sim.js` ist nur ein dünner Reexport auf `src/game/sim/step.js` (kein Legacy-Backcompat-Wrapper).
- LLM-spezifische Policy/Read-Model/Command-Adapter liegen außerhalb des Kernels unter `src/project/llm/*`.

## Repro-Kommandos

```bash
node tests/test-core-gates.mjs
node tests/test-sim-gate.mjs
node tests/test-buffered-step.mjs
node tests/test-divergence.mjs
node tests/test-determinism-long.mjs
node tests/test-determinism-per-tick.mjs
node tests/test-determinism-with-interactions.mjs
node tests/test-faction-metrics.mjs
node tests/test-gameplay-loop.mjs
node tests/test-version-traceability.mjs
node tests/test-path-hygiene.mjs
node tools/redteam-stress-master.mjs
node tools/run-all-tests.mjs
```

## Definition of Done

- Manifest aktuell
- Reducer patch-only
- Mutations-Gate intakt
- State schema-konform
- Determinismus intakt
- Renderer/UI read-only
- `npm test` grün
- Aktive Doku und aktive Pfade synchron
- Keine Wrapper- oder Altdoku-Referenzen im aktiven Material

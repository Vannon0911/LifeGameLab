# LLM ENTRY

## Zweck
Dieses Repository ist ein deterministisches Contract-System. Jede Aenderung muss gate-konform, patch-basiert und reproduzierbar sein.

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
12. `src/game/render/render.worker.js`
13. `src/project/ui.js`
14. `src/game/ui/ui.js`
15. `src/app/main.js`
16. `src/game/sim/stepPhases.js`
17. `src/game/sim/stepRuntime.js`
18. `src/game/sim/reducer/controlActions.js`
19. `src/game/ui/ui.constants.js`
20. `src/game/ui/ui.model.js`
21. `src/game/ui/ui.dom.js`
22. `src/game/ui/ui.feedback.js`
23. `src/app/runtime/publicApi.js`
24. `src/app/runtime/worldStateLog.js`
25. `src/app/runtime/reportUtils.js`
26. `src/app/runtime/bootStatus.js`

## Harte Invarianten
- State nur ueber `dispatch()` plus Patches
- Kernel bleibt einziger Keeper
- Renderer und UI bleiben read-only gegen Gameplay-State
- kein `Math.random()` oder `Date.now()` in Reducer oder SimStep
- neue Felder und Actions zuerst im Manifest und Contract

## Pflichtquellen
- `docs/PRODUCT.md`: Produkt- und Scope-Basis
- `docs/ARCHITECTURE.md`: technische Snapshot-Wahrheit
- `docs/STATUS.md`: aktive Gates, Bugfixes, Release- und Change-Stand

## Definition Of Done
- Contract und Gates intakt
- Determinismus intakt
- Pfadhygiene intakt
- Doku und Code synchron
- passende Tests gruen

## Zusätzliche Pflichtchecks Bei Sim/UI-Refactors
- `node tests/test-drift-negative-order.mjs`
- `node tests/test-determinism-long.mjs`
- `npm run test:quick`
- `npm run test:truth`

## Testklassen
- `quick`: lokale Schnellgates
- `truth`: Determinismus- und Wahrheitsbeweise
- `stress`: Redteam-Stress

## Hygiene
- Release-Artefakte nie mit `.git` oder `node_modules` verteilen
- keinen toten Nebenbestand im aktiven Projektbaum mitfuehren

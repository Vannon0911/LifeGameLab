# LLM_ENTRY

## Zweck
Dieses Repository ist ein deterministisches Contract-System. Jede Aenderung muss Gate-konform, patch-basiert und reproduzierbar sein.

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
15. `src/game/sim/stepPhases.js`
16. `src/game/sim/stepRuntime.js`
17. `src/game/sim/reducer/controlActions.js`
18. `src/game/ui/ui.constants.js`
19. `src/game/ui/ui.model.js`
20. `src/game/ui/ui.dom.js`
21. `src/game/ui/ui.feedback.js`
22. `src/app/runtime/publicApi.js`
23. `src/app/runtime/worldStateLog.js`
24. `src/app/runtime/reportUtils.js`
25. `src/app/runtime/bootStatus.js`

## Harte Invarianten
- State nur ueber `dispatch()` + Patches.
- Kernel (`src/core/kernel/*`) bleibt einziger Keeper.
- Renderer/UI sind read-only gegenueber Gameplay-State.
- Kein `Math.random()`/`Date.now()` in Reducer oder SimStep.
- Neue Felder/Actions/Writes zuerst im Manifest.

## Definition Of Done
- Contract/Gates intakt
- Determinismus intakt
- Pfadhygiene intakt
- Doku und Code synchron
- `npm test` gruen

## Zusätzliche Pflichtchecks bei Sim/UI-Refactors
- `node tests/test-drift-negative-order.mjs`
- `node tests/test-determinism-long.mjs`
- `npm run test:quick`
- `npm run test:truth`

## Testklassen (bindend)
- `quick`: lokale Schnellgates
- `truth`: Determinismus-/Wahrheitsbeweise
- `stress`: Redteam-Stress

## Hygiene
- Release-Artefakte nie mit `.git` oder `node_modules` verteilen.
- Kein altes Sandbox-Nebenuniversum im aktiven Projektbaum mitfuehren.

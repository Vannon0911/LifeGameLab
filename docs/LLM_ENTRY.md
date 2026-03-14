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
- State nur ueber `dispatch()` + Patches.
- Kernel (`src/core/kernel/*`) bleibt einziger Keeper.
- Renderer/UI sind read-only gegenueber Gameplay-State.
- Kein `Math.random()`/`Date.now()` in Reducer oder SimStep.
- Neue Felder/Actions/Writes zuerst im Manifest.

## Phasen-Doku (bindend)
- `docs/PHASE_A_TODO.md`: abgeschlossene Genesis-/Core-Phasen A und B inklusive belegter Nicht-Ziele
- `docs/PHASE_C_TODO.md`: abgeschlossene DNA-/Zone-2-Phase inklusive belegter Nicht-Ziele
- `docs/PHASE_D_TODO.md`: kanonische Ticketfolge fuer Infrastruktur + aktive Sicht/Fog
- `docs/PHASE_E_TODO.md`: gesperrte Folgephase fuer kanonisches Zonensystem + Pattern-Engine
- `docs/PHASE_F_TODO.md`: gesperrte Folgephase fuer Tech-Tree, Progression und Objectives
- `docs/PHASE_G_TODO.md`: gesperrte Folgephase fuer Balance, Cleanup und RC-Haertung
- Bei Tasks mit Progression, Genesis, Core-Zone, DNA-Zone, Infrastruktur, Sicht/Fog, Pattern, Tech-Tree oder Release-Gates sind die passenden Phase-Dateien vor Implementierung mitzulesen.

## Definition Of Done
- Contract/Gates intakt
- Determinismus intakt
- Pfadhygiene intakt
- Doku und Code synchron
- `npm run test:quick` gruen

## Zusätzliche Pflichtchecks bei Sim/UI-Refactors
- `node tests/test-drift-negative-order.mjs`
- `node tests/test-determinism-long.mjs`
- `npm run test:quick`
- `npm run test:truth`

Hinweis:
- `npm test` ist bewusst quick-only.
- Grosse Laeufe (`truth`, `stress`) nur explizit (`npm run test:full` oder gezielte Suiten).

## Testklassen (bindend)
- `quick`: lokale Schnellgates
- `truth`: Determinismus-/Wahrheitsbeweise
- `stress`: Redteam-Stress

## Hygiene
- Release-Artefakte nie mit `.git` oder `node_modules` verteilen.
- Kein altes Sandbox-Nebenuniversum im aktiven Projektbaum mitfuehren.

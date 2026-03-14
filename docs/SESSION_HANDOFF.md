# SESSION_HANDOFF

## Aktueller Betriebsmodus
- Kernel bleibt einziger Keeper
- Contract-Module unter `src/project/contract/*`
- LLM-Module unter `src/project/llm/*`
- Sim-Reexports fuer Kompatibilitaet erhalten
- `src/game/sim/step.js` ist Orchestrator, Tick-Phasen liegen in `src/game/sim/stepPhases.js`
- `src/game/sim/stepRuntime.js` enthaelt pure Runtime-Helfer (Trait/Lineage)
- `src/game/ui/ui.js` nutzt getrennte UI-Model-/Konstantenmodule
- `src/game/ui/ui.dom.js` und `src/game/ui/ui.feedback.js` kapseln UI-Helfer
- Public Hooks (`render_game_to_text`, `advanceTime`) werden ueber `src/app/runtime/publicApi.js` bereitgestellt
- `main.js` wurde als Orchestrator abgespeckt; WorldLog/Report/BootStatus liegen in `src/app/runtime/*`

## Beim naechsten Einstieg sofort pruefen
- `docs/LLM_ENTRY.md`
- `docs/PROJECT_CONTRACT_SNAPSHOT.md`
- `node tests/test-drift-negative-order.mjs`
- `node tests/test-determinism-with-interactions.mjs`
- `npm run test:quick`
- `npm run test:truth`
- `npm test`

## Naechste sinnvolle Arbeit
- Performance-Baseline neu messen
- Laufzeitbudgets in `docs/TEST_BUDGETS.md` aktuell halten
- groesste Datenquellen aufteilen/reduzieren
- UX-Feedback im Kernloop weiter schaerfen

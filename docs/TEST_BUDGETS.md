# TEST_BUDGETS

Ziel: Lange Determinismuslaeufe sind bewusst teuer und kein Defekt.

## Klassen
- `quick`: schnelle Contract-/Path-/UI-/Gate-Checks (lokal vor jedem Push)
- `truth`: deterministische Wahrheitsbeweise und Gameplay-Integritaet
- `stress`: Redteam-Haertung gegen Missbrauch/Bypass

## Runner
- `npm run test:quick`
- `npm run test:truth`
- `npm run test:stress`
- `npm test` (quick only; truth/stress explizit oder per full)
- `npm run test:full` (quick + truth + stress)

## Laufzeitbudgets (Stand: 2026-03-14)
- `quick`: Budget 60s, beobachtet ~7s
- `truth`: Budget 220s, beobachtet ~90s
- `stress`: Budget 30s, beobachtet <1s

## Teure Einzeltests (Richtwerte)
- `tests/test-determinism-per-tick.mjs`: ~55-65s
- `tests/test-determinism-with-interactions.mjs`: ~12-16s
- `tests/test-determinism-long.mjs`: ~5-8s

Interpretation:
- Wenn diese Tests innerhalb des Budgets laufen, gilt das als gesund.
- "Langsam" ist hier kein "kaputt", solange Hash-/Trace-Gleichheit und Exitcode stimmen.

## Aenderungsnotiz 2026-03-14 (Test-Haertung)
- `tests/test-smoke.mjs`: Determinismus auf Checkpoints erweitert (Tick 25/50/75/100) inklusive seed-/tick-spezifischer Fehlertexte; `clusterRatio` nur finite + nicht-negativ.
- `tests/test-ui-contract.mjs`: Dispatch-Erkennung von globaler String-Regex auf dispatch-nahe Extraktion umgestellt; Kommentare und irrelevante Literale zaehlen nicht als echte Dispatches; bidirektionaler Contract-Check beibehalten.
- `tests/test-ui-strategy-contract.mjs`: Assertions auf harte Contract-Invarianten fokussiert (Panel-Key-Set, disjunkte Main-Run/Lab-Action-Sets, Manifest-Bindungen, Public-API-Bindungen).
- `tests/test-llm-contract.mjs`: Preflight-Verhalten weiter via `spawnSync`; Fehlerpruefung auf stabile Markerklassen gehaertet; Task-Mismatch-Negativfall ergaenzt.
- Drift-Fix: `SET_PLACEMENT_COST`-Deklaration in `src/project/contract/dataflow.js` auf reale Dispatch-Quelle korrigiert (`dispatchSources: []` statt UI-Quelle).
- Produktivlogik unveraendert; einzige Produktivdatei-Aenderung ist die Contract-Korrektur in `src/project/contract/dataflow.js`.

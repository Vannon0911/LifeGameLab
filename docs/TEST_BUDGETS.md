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
- `npm test` (quick + truth + stress)

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

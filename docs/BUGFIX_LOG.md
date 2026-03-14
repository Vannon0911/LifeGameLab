# BUGFIX LOG — v2.3.0

## Relevante Fixes

- `PLACE_CELL` erzeugt auf leeren Feldern Spielerzellen
- Spieleraktionen können CPU-Zellen nicht überschreiben oder löschen
- gelöschte Spielerzellen werden sauber bereinigt
- World-Log-CSV nutzt feste Spaltenreihenfolge
- `npm test` läuft über einen Node-basierten, plattformfesten Runner
- SIM-Backcompat-Wrapper entfernt (`src/game/sim/sim.js`)
- `simStepPatch` Legacy-Signatur entfernt; nur noch `simStepPatch(state, action, ctx)`
- WinMode-Drift korrigiert (`stockpile` bleibt Contract-ID, keine Ergebnis-Umschreibung auf `territory`)
- ungültige `SET_BRUSH`/`SET_OVERLAY`/`SET_WIN_MODE` Inputs werden deterministisch verworfen

## Struktur- und Qualitätsmaßnahmen

- fruehere Wrapper-Schicht und der alte Root-Browser-Entry entfernt
- Tests und Tools auf `src/core/*`, `src/game/*`, `src/project/*`, `src/app/main.js` umgestellt
- operative Doku auf kanonische Struktur reduziert
- `tests/test-version-traceability.mjs` prüft Versionskonsistenz
- `tests/test-path-hygiene.mjs` blockiert alte Wrapper-Pfade in aktivem Material
- `tests/test-string-contract.mjs` blockiert Enum-/String-Drift
- `tests/test-dataflow-contract.mjs` prüft Action->Writes->Dispatch-Quellen
- `tests/test-wrapper-ban.mjs` erzwingt Wrapper-Verbot im SIM-Runtime-Pfad

## Verifikation

- Vollsuite grün
- Redteam grün
- operative Doku mit aktueller Projektstruktur synchron

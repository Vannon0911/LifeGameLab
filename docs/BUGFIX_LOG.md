# BUGFIX LOG — v2.3.0

## Relevante Fixes

- `PLACE_CELL` erzeugt auf leeren Feldern Spielerzellen
- Spieleraktionen können CPU-Zellen nicht überschreiben oder löschen
- gelöschte Spielerzellen werden sauber bereinigt
- World-Log-CSV nutzt feste Spaltenreihenfolge
- `npm test` läuft über einen Node-basierten, plattformfesten Runner

## Struktur- und Qualitätsmaßnahmen

- fruehere Wrapper-Schicht und der alte Root-Browser-Entry entfernt
- Tests und Tools auf `src/core/*`, `src/game/*`, `src/project/*`, `src/app/main.js` umgestellt
- operative Doku auf kanonische Struktur reduziert
- `tests/test-version-traceability.mjs` prüft Versionskonsistenz
- `tests/test-path-hygiene.mjs` blockiert alte Wrapper-Pfade in aktivem Material

## Verifikation

- Vollsuite grün
- Redteam grün
- operative Doku mit aktueller Projektstruktur synchron

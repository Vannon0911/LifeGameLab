# Quality Audit 2026-03-15

## Scope
- Schreibfehler/Tippfehler in Doku und UI-Texten
- Artefakt- und Aufraeumkandidaten im Projekt
- Funktions-Bestandsliste fuer refactoring-orientierte Aufraeumarbeiten

## Tippfehler Gefixt
- `docs/STATUS.md`
  - `trest and fixxes` -> `test and fixes`
- `src/game/ui/ui.js`
  - `commitete` -> `committete` (2 Stellen)
- `src/game/ui/ui.lage.js`
  - `commiteter` -> `committeter`
  - `commitete` -> `committete`

## Artefaktlage
- `output/` enthaelt aktuell `102` Dateien mit ca. `19.03 MB`.
- Hotspots nach Dateianzahl:
  - `output/web-game/debug-loop` (23)
  - `output/web-game/capture-timing-isolation` (14)
  - mehrere `manual-check*` Verzeichnisse (je 10-11)
- Typische Aufraeumkandidaten:
  - `*.log`
  - `tmp-*.mjs`
  - alte `iter-*.png` und `iter-*.json` aus Debug-Runs

## Funktionsinventur
- Gesamt: `693` Funktions-Treffer in `src/`, `tests/`, `tools/`.
- Vollstaendige Liste:
  - `output/reports/function-inventory.txt`
- Summary:
  - `output/reports/function-inventory-summary.md`

## Empfohlene Aufraeumschritte
1. `output/web-game/manual-check*` auf nur den letzten validierten Lauf reduzieren.
2. `output/web-game/capture-timing-isolation` auf einen Referenzsatz reduzieren.
3. `.log` und `tmp-*.mjs` in `output/` bereinigen.
4. Falls Artefakte fuer Teamvergleich benoetigt werden: pro Kategorie nur `summary.json` + 1-2 Referenzbilder behalten.

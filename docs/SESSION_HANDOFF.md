# SESSION HANDOFF — LifexLab v2.3.0 Game Sandbox

## Stand

- kanonische Projektstruktur aktiv
- flache aktive Doku unter `docs/`
- operative Doku bereinigt
- leere Legacy-Pfade entfernt; Hygiene-Test erzwingt jetzt echte Abwesenheit
- Vollsuite grün: `npm test`
- Determinismus grün: long, per-tick und interaction traces
- Core-, SIM-, Dataflow- und Pfadhygiene-Gates grün
- Browser-Check für UI/UX und Strategy-Contract grün; `window.render_game_to_text` und `window.advanceTime` vorhanden
- Rework v3 steht:
  - Mobile-Sheet blockiert das Dock nicht mehr
  - HUD priorisiert `Kolonie`, `DNA`, `Risiko`, `Directive`, `Mission`
  - `Status` kommuniziert Mission, Risiko und Strukturreife statt reiner KPI-Sammlung
  - `Evolution` ist auf aktuellen und nächsten Ring komprimiert
  - `Systeme` trennt `Spielraum` von `Lab`
  - Renderer zeigt ruhigere Weltpalette und sichtbare `2x2`-Biomodule / reifere Koloniekerne

## Aktive Struktur

- `src/app/`
- `src/core/`
- `src/game/`
- `src/project/`
- `tests/`
- `tools/`
- `docs/`

## Nächste sinnvolle Schritte

- Win-Bedingungen für Release-Build reaktivieren
- weiteren Reducer-Abbau nach `src/game/sim/playerActions.js` fortsetzen
- visuelle Energie-/Flow-Layer ausarbeiten
- Missions-, Unlock- und Synergie-FX im Canvas weiter verdichten, damit der Produkt-Loop noch weniger nach Kontrollpanel und stärker nach Spiel wirkt

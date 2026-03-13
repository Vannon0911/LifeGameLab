# Task Sequence (P0 -> P5)

**SYSTEM STANDARD**
1. Jede Änderung bleibt deterministisch und manifest-first.
2. Aktive Dokumentation und aktive Pfade müssen synchron bleiben.
3. Es existieren nur noch kanonische Quellpfade.

## Aktueller Stand

- Wrapper und Legacy-Pfade sind entfernt.
- Operative Wahrheit liegt in `src/app`, `src/core`, `src/game`, `src/project`, `tests`, `tools`, `docs`.
- `npm test` ist der verpflichtende Vollnachweis.

## P4: Härtung & Produktionslage

- **HARD-01** [KRITISCH] Physik-Härtung in `src/core/kernel/physics.js`
- **HARD-02** [HOCH] Adaptive CPU-Strategie in `src/game/sim/worldAi.js`
- **MECH-03** [HOCH] Spezialisierungs-Zwang im Ressourcen-/Ernte-Loop
- **PROD-01** [MITTEL] DNA-Speicherlimit und Silo-Mechanik
- **PROD-02** [MITTEL] Upkeep für aktive Zonen
- **UI-HARD-01** [MITTEL] Kausalitäts-HUD
- **SIM-03** [HOCH] Aggressive CPU-Expansion über Zonen-Bau-Logik

## P5: Release & Sieg

- **CORE-01** [HOCH] Re-Aktivierung der Win-Conditions in `src/game/sim/reducer.js`
- **DOC-SYNC** [STRENG] Snapshot und Handoff auf finalen Release-Stand bringen

## UI-/Mechanik-Backlog

- **UI-GAME-02** `src/game/ui/ui.js` + `styles.css`  
  Topbar-Chips final synchronisieren.
- **UI-GAME-03** `src/game/ui/ui.js`  
  Dock auf eine Werkzeugleiste reduzieren.
- **UI-GAME-04** `src/game/render/renderer.js`  
  Spieler-/CPU-Zellen visuell klar trennen.
- **UI-GAME-05** `src/game/ui/ui.js`  
  Status-Panel als Lagebericht darstellen.
- **UI-GAME-06** `src/game/ui/ui.js`  
  Sieg/Niederlage narrativ zusammenfassen.
- **MECH-01** `src/project/project.manifest.js` + `src/game/sim/reducer.js`  
  `PLACE_CELL` mit Energiekosten koppeln.
- **MECH-02** `src/game/sim/reducer.js`  
  Win-Bedingungen an Spieleraktionen koppeln.

## Abbruchregel

Bei jedem STOP-Marker in einem Work-Task ist Validierung Pflicht, bevor der nächste Task beginnt.

# Scope Baseline

## Primäres Projektziel
Spielbare, deterministisch reproduzierbare Simulation mit Energieökonomie, Fraktionen, DNA-Ressource, Evolution und Zonendesign.

## Phasen
- **P0**: Startblocker beseitigen. Kein `assertPatchesAllowed`-Fehler, kein schwarzer Screen.
- **P1**: Fraktions-Identität und Energie-Metriken im State sichtbar machen.
- **P2**: DNA als erntbare Ressource über `HARVEST_CELL`.
- **P3**: Erste echte Spielentscheidungen über `BUY_EVOLUTION` und `SET_ZONE`.

## Architektur-Layer
- `KERNEL`: `src/core/kernel/*` -> nur bei explizitem Kernel-Task ändern
- `RUNTIME`: `src/core/runtime/*`
- `SIM-DATA`: Manifest, Constants, Life-Data
- `SIM-LOGIC`: Reducer, Step, Worldgen
- `SIM-MODULE`: Conflict, Lineage, Network, ...
- `RENDER`: `src/game/render/renderer.js` -> read-only
- `UI`: `src/project/ui.js`, `src/project/renderer.js` -> liest State, dispatcht Actions

## Unverletzliche Invarianten
1. Kernel wird nicht verändert.
2. State ändert sich nur über Reducer-Patches.
3. TypedArrays vor Mutation klonen.
4. Kein `Math.random()`, nur Kernel-RNG.
5. Keine neuen globalen Variablen oder Dependencies.
6. Keine Features außerhalb des Task-Scopes.
7. Keine vagen Refactors.
8. Neue `sim.*`-Metriken immer in `SIM_KEYS` und Manifest-Gate.
9. Neue `world.*`-Felder immer in `WORLD_KEYS` und Manifest-Gate.
10. Neue Actions zuerst ins Manifest.

## Source Priority
1. `README.md`
2. `docs/LLM_ENTRY.md`
3. `docs/PROJECT_CONTRACT_SNAPSHOT.md`
4. `docs/TASK_SEQUENCE.md`
5. `tests/`

## Dokumentationsregel

- Aktive Projektdokumentation liegt nur unter `docs/`.
- Struktur- und Pfadentscheidungen muessen mit `tests/test-path-hygiene.mjs` vereinbar sein.

## Post-P3 Erweiterungen (2026-03-13)

Alle P0–P3 DoD-Kriterien erfüllt. Folgende Erweiterungen wurden außerhalb des ursprünglichen Scopes hinzugefügt:

- `stockpileTicks` Feld: Stockpile-Win-Bedingung balanciert (30-Tick-Hold + skalierender Threshold)
- `zoneMap`-Sim-Effekte: NEXUS/BUFFER/QUARANTINE/HARVEST wirken jetzt tatsächlich auf die Simulation
- `drawZoneOverlay`: Zonen sichtbar im Canvas
- `cpuEnergyIn` im Energie-Dashboard der UI

## Offene Punkte (Backlog)

- DEFENSE-Zone Conflict-Malus
- activeTiles-Performance (step.js Sections H+J)
- Flow Lines / Waste Haze (Render-Effekte)

## Game-UI Redesign (2026-03-13) — Konzept: „Vom Labor zum Cockpit"

Ziel: UI erzählt nicht mehr „ich bin eine Simulation", sondern „ich bin ein Spiel".
Designquelle: Konzeptdokument „Von der Zellsimulation zur spielbaren Kolonie-Strategie".

### Informationsebenen
- Ebene 1 (immer sichtbar): DNA, Energie-Trend, Gefahr, Stage, aktive Aktion
- Ebene 2 (kontextuell): Zonen-Overlay, Toxin, Nährstoffe, Cluster
- Ebene 3 (optional/Debug): Rohwerte, Render-Modi, Telemetrie

### Task-Liste

| Task-ID     | Layer  | Datei                        | Ziel                                              |
|-------------|--------|------------------------------|---------------------------------------------------|
| UI-GAME-01  | UI     | src/game/ui/ui.js            | Canvas-HUD: nx-hud durch minimales Spieler-HUD ersetzen |
| UI-GAME-02  | UI     | src/game/ui/ui.js            | Topbar: 7 Chips → 3 spielrelevante Chips + Spielersprache |
| UI-GAME-03  | UI     | src/game/ui/ui.js            | Dock: Doppel-Nav → 1 Werkzeugleiste mit Verben    |
| UI-GAME-04  | RENDER | src/game/render/renderer.js  | Spieler-/CPU-Zellen visuell unterscheidbar machen |
| UI-GAME-05  | UI     | src/game/ui/ui.js            | Status-Panel: Rohliste → Lagebericht              |
| UI-GAME-06  | UI     | src/game/ui/ui.js            | Sieg/Niederlage-Screen: Erzählung + Schlüsselfaktor |
| MECH-01     | SIM-DATA + SIM-LOGIC | project.manifest.js + reducer.js | PLACE_CELL kostet Energie (Ressourcen-Loop) |
| MECH-02     | SIM-LOGIC | src/game/sim/reducer.js     | Win-Bedingungen an Spieleraktionen koppeln        |

### Unverletzliche Constraints für alle Game-UI Tasks
- Kernel unberührt
- Kein neues State-Feld ohne Manifest-Eintrag (gilt für MECH-01/02)
- UI-Tasks dürfen keine Sim-Logik enthalten
- Render-Tasks lesen State, schreiben nie
- Debug-Telemetrie bleibt erhalten — hinter `meta.devMode`-Flag

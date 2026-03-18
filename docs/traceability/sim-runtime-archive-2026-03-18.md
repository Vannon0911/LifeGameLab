# SIM Runtime Archive (2026-03-18)

## Scope
- Archiviert ist nur die Runtime-Nutzung der Sim im App/UI/Render-Flow.
- Kernel, Contract und Sim-Code bleiben im Repository erhalten.
- Diese Archivierung ist ein Betriebs-Block, keine Loeschung.

## Was wurde blockiert
- `src/app/main.js`: `SIM_RUNTIME_DISABLED = true`.
- `src/game/ui/ui.js`: keine sim-getriebenen Inputs/Orders/HUD-Updates.
- `src/game/render/renderer.js`: sim-basierte Harvest/Pattern-Overlays im Frame-Flow deaktiviert.

## Begründung
- Aktueller Rework-Scope ist UI-first (Grid/Struktur) ohne laufende Gameplay-Logik.
- Sim-gekoppelte Runtime-Pfade erzeugen Seiteneffekte, die den UI-Neuaufbau blockieren.
- Ziel ist isoliertes Wiring ohne Kernel-Eingriff und ohne verdeckte Sim-Automatismen.

## Guardrails
- Kein Kernel-Touch fuer diesen Block.
- Kein Contract-Abbau, nur Runtime-Isolation.
- Reaktivierung spaeter nur explizit, mit Entry-Preflight und Testnachweis.

## Referenzen
- `src/app/main.js`
- `src/game/ui/ui.js`
- `src/game/render/renderer.js`

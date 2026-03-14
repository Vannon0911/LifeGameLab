# UPDATE NOTE — v2.4.0

## Kernpunkt
- Der Main Run ist jetzt haerter auf `ernten -> investieren -> ausbauen -> Engpaesse loesen` verdrahtet.

## Sichtbare Aenderungen
- Ein deterministisches Advisor-Modell liefert jetzt denselben Laufzeitblick fuer HUD, Statuspanel und `render_game_to_text`.
- `Win Mode` ist vor Tick 1 waehlbar und danach im Main Run fixiert.
- `Placement Cost` ist standardmaessig aktiv.
- `Global Learning` ist standardmaessig aus und damit kein stiller Main-Run-Eingriff mehr.
- `activeOverlay` steuert jetzt echte Diagnosebilder fuer `energy`, `toxin`, `nutrient`, `territory` und `conflict`.
- Das Statuspanel zeigt Run-Pfad, primären Engpass, Blocker, naechste Hauptaktion und naechsten Ausbauhebel direkt.
- `advanceTime` wird im Statuspanel als Vorspulen-/Analysewerkzeug angeboten.

## Technische Konsequenzen
- Neue Vertrags- und Determinismus-Tests decken Advisor-Priorisierung, Blocker, Overlay-Nutzwert und Main-Run-Defaults ab.
- Legacy-Interaktionstests schalten Placement Cost jetzt explizit aus, wenn sie kostenlose Sandbox-Eingriffe pruefen wollen.

## Nicht in diesem Release geloest
- Keine numerische Doctrine-/Tech-Rebalance.
- Kein Director-/DevBalance-Ausbau fuer den Standard-Run.

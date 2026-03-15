# Implementation Constraints

Kurzfassung fuer Agents und LLMs. Das ist keine Feature-Liste, sondern ein Filter gegen Eigenerfindungen.

## Harte Produktgrenzen

- `LifeGameLab` ist ein deterministisches, run-basiertes Struktur- und Aufbauspiel auf einem Raster.
- Acht-Richtungs-Nachbarschaft ist Kernlogik und nicht optional.
- Form ist Gameplay. Strukturen, Muster, Kombinationen und Fusionen muessen aus Platzierung, Verbindung und Umgebung folgen.
- Fehler duerfen schmerzen, aber nicht standardmaessig sofort in Game Over umkippen.
- Expansion bleibt spannungsgetrieben: Kosten, Risiko, Instabilitaet und Ineffizienz sind Pflicht.
- Win Conditions und Run-Abschluss sind Pflicht. Keine offene Endlos-Sandbox als Main-Run-Zielbild.
- Meta-Progression erweitert Moeglichkeiten, sie ersetzt das Kernsystem nicht.
- CPU-Learning bestraft Gewohnheit, nicht Kreativitaet.

## Systemgrammatik

Neue Inhalte muessen in diese Grammatik passen:

> Zellen + Typ + Feld + Nachbarschaft + Zustand + Kosten + Traits = Effekt, Modifikation oder Fusion

Wenn eine Idee nicht in diese Grammatik passt, ist sie kein kleiner Zusatz, sondern ein potenziell neues System und muss explizit begruendet werden.

## Verbotene Ausweichbewegungen

- Keine kreativen Fuellsysteme fuer unklare Luecken.
- Keine Sondergesetze, die bestehende Zell-, Muster- oder Fusionslogik entwerten.
- Keine Main-Run-Rueckkehr zu reiner Sandbox, Idle-Loop oder Diagnose-Techdemo.
- Keine Produktentscheidung gegen Determinismus, Vergleichbarkeit oder Run-Struktur.

## Operative Prioritaet

Bei Konflikten gilt:

1. Contract- und Kernel-Invarianten
2. aktive Phase-TODOs und Pflicht-Gates
3. `docs/CONCEPT_BASIS.md`

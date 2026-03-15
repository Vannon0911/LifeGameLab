# PRODUCT

## Produktkern
LifeGameLab ist ein deterministisches, run-basiertes Struktur- und Aufbauspiel auf einem Raster.
Der Main-Run ist kein offener Sandbox-Spielplatz, sondern eine Folge harter Freischaltungen und Commitments.

## Leitidee
Der Spieler agiert als Operator:
- beobachten
- Lage lesen
- Engpaesse verstehen
- gezielt eingreifen
- neue Systemebenen freischalten

## Main-Run-Raeume
- `lage`: Koloniezustand, Risiko, Ziele, Bottlenecks
- `eingriffe`: semantische Main-Run-Aktionen
- `evolution`: Freischaltungen, Doctrine, Progression
- `welt`: Preset, Seed, Weltwahl
- `labor`: Benchmark, Diagnose, Legacy-Werkzeuge, Roh-Brushes

Labor bleibt strikt vom Main-Run getrennt.

## Produktgrenzen
- kein Main-Run-Revival alter Sandbox- oder Diagnosepfade
- keine neue Zone oder neue Presets ausserhalb eines expliziten Tickets
- keine kreative Lueckenfuellung gegen bestehende Contract- oder Progressionslogik
- keine Produktentscheidung gegen Determinismus, Vergleichbarkeit oder Run-Struktur

## Systemgrammatik
Neue Inhalte muessen in diese Grammatik passen:

> Zellen + Typ + Feld + Nachbarschaft + Zustand + Kosten + Traits = Effekt, Modifikation oder Fusion

Wenn eine Idee nicht in diese Grammatik passt, ist sie kein kleiner Zusatz.

## Kanonische Spielbasis
- Acht-Richtungs-Nachbarschaft bleibt Kernlogik.
- Form ist Gameplay.
- Fehler duerfen wehtun, aber nicht standardmaessig sofort in Game Over kippen.
- Expansion bleibt kosten-, risiko- und stabilitaetsgetrieben.
- Win-Conditions und ein echter Run-Abschluss sind Pflicht.

## Weltmodell
- Preset-IDs: `river_delta`, `dry_basin`, `wet_meadow`
- Biome: `barren_flats`, `riverlands`, `wet_forest`, `dry_plains`, `toxic_marsh`
- `meta.worldPresetId` ist die Preset-Wahrheit.
- `world.water` ist Wasser.
- `world.W` bleibt Toxin und wird nie als Wasser umgedeutet.

## Progressionsbogen
- Genesis: Founder setzen und Gruendung bestaetigen
- Core: Energiekern committen und Run aktivieren
- DNA: zweite Zone committen und DNA-Erzeugung oeffnen
- Infra/Fog: Netzwerk und Sicht aufbauen
- Pattern/Zone: kanonische Zonen und Pattern-Effekte nutzen
- Evolution/Result: Tech-Gates, Progression und deterministische Losepfade

## Harte Prioritaet Bei Konflikten
1. Contract- und Kernel-Invarianten
2. aktive Status-/Release-Gates in `docs/STATUS.md`
3. diese Produktbasis

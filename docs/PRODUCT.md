# PRODUCT

Version: 1.0

## Produktkern
LifeGameLab ist ein deterministisches Browser-RTS, das mit genau einer Zelle beginnt.
Kein Tutorial, keine Gebaeudemenues und keine versteckten Startskripte.
Der erste Zug ist immer direkt: Zelle bewegen, Ressource abbauen, Wirtschaft aufbauen.

Die zentrale Entscheidung bleibt ueber das ganze Match gleich:
- Zelle als Worker weiter nutzen
- oder Zelle dauerhaft in Muster und Infrastruktur investieren

Aus dieser Entscheidung entstehen Wirtschaft, Zonen, Muster-zu-Objekt-Erkennung,
Automatisierung, Kampf und emergente Militaerkombinationen.

## Welt
Die Welt ist seedbasiert und reproduzierbar.
- gleicher Seed -> gleiche Welt
- gleiche Inputs -> gleiche Ergebnisse

Die Karte ist fair, aber nicht trivial gespiegelt.
Beide Seiten erhalten vergleichbare Startchancen.

Der Spannungsbogen kommt aus der Weltstruktur:
- Stabilisierung
- Expansion
- Konflikt

## Start
Jeder Spieler startet mit genau einer Zelle.
Die Zelle wird wie ein RTS-Worker gesteuert:
- zur Ressource bewegen
- abbauen
- zweite Zelle erzeugen

Kein vorgeschaltetes Tutorial.
Die erste Interaktion erklaert das Spiel selbst.

## Wachstum
Mit zwei Zellen beginnt der erste Effizienzsprung.
Frueher Kernloop:
- Ressourcen abbauen
- neue Zellen erzeugen
- Einkommen stabilisieren
- erste Zone vorbereiten

## Zonen
Zonen sind feste quadratische Flaechen im Grid:
- 2x2
- 4x4
- 6x6
- 8x8

Zonentyp wird beim Setzen festgelegt:
- Abbauzone
- Weiterverarbeitungszone
- Herstellungszone

Je groesser die Zone, desto hoeher Kosten und Kombinationsraum.

## Muster und Objekte
Ab mindestens vier Zellen in einer Zone koennen Verbindungen gesetzt werden.
Das System erkennt Muster und erzeugt daraus Objekte/Funktionen.

Prinzip:
- keine Gebaeude aus Liste anklicken
- Funktionen durch raeumliche Muster entdecken

## Wirtschaft
Drei Stufen:
1. Abbau
2. Weiterverarbeitung
3. Herstellung

Ziel des Early Games:
Grundversorgung so stabilisieren, dass sie sich selbst traegt.

## Spielphasen
- Early Game: Ueberleben, erste Stabilisierung
- Mid Game: Automatisierung, Spezialisierung
- Endgame: Militaerische Kombinationen und strategischer Druck

## Konflikt und Niederlage
Konflikt entsteht aus gemeinsam attraktiven Ressourcenraeumen.
Kein kuenstliches Event muss Kampf erzwingen.

Loss Condition:
- letzte Zelle eines Spielers stirbt -> Match verloren
- kein Respawn

## Technische Leitplanken
- Vanilla JavaScript
- deterministischer Kern
- 24 Ticks pro Sekunde
- renderAlpha-Interpolation im Renderpfad
- UI dispatcht nur, UI mutiert nie direkt

## MVP-Beweisziele
1. Eine Zelle als Start fuehlt sich sofort spielbar an.
2. Worker-vs-Investment erzeugt echte Strategie.
3. Muster-zu-Objekt ist im Grid sichtbar und relevant.
4. Die Welt erzeugt den Bogen Stabilisierung -> Expansion -> Konflikt ohne Script-Tricks.

## Harte Prioritaet bei Konflikten
1. Contract- und Kernel-Invarianten
2. Aktiver technischer Status in `docs/STATUS.md`
3. Diese Produktbasis

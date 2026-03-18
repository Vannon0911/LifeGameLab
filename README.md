# LifeGameLab - Gesamtkonzept v0.6

LifeGameLab ist ein deterministisches Browser-RTS, das mit genau einer Zelle startet.
Kein Tutorial, keine Gebaeudemenues, keine versteckten Hilfssysteme:
Der erste Spielzug ist direkte Kontrolle einer einzelnen Zelle im Grid.

## 1. Kernidee

Das Spiel baut auf einer harten Kernspannung auf:

- Nutze ich neue Zellen weiter als Worker?
- Oder binde ich sie dauerhaft in Muster und Infrastruktur?

Aus dieser Entscheidung entstehen Oekonomie, Expansion, Zonen, Automatisierung und spaeter Kampf.

## 2. Welt und Fairness

Die Welt ist seedbasiert und reproduzierbar:

- gleicher Seed -> gleiche Welt
- gleiche Inputs -> gleiche Sim-Ergebnisse

Die Karte ist fair, aber nicht trivial gespiegelt.
Beide Seiten bekommen vergleichbare Startchancen, nicht zwingend identische Geometrie.

Die Ressourcenverteilung erzeugt den Spannungsbogen organisch:

- Stabilisierung
- Expansion
- Konflikt

## 3. Startzustand

Jeder Spieler startet mit einer einzigen Zelle.
Diese Zelle ist der erste Worker und wird direkt bewegt.

Erster Loop:

1. zur nahen Quelle bewegen
2. abbauen
3. zweite Zelle erzeugen
4. Einkommen parallelisieren

## 4. Fruehe Wachstumsphase

Mit zwei Zellen beginnt das eigentliche Wirtschaftsspiel:

- paralleler Abbau
- schnellerer Ressourcenzuwachs
- Vorbereitung der ersten Zone

Frueher Kernloop:

- Ressourcen abbauen
- neue Zellen erzeugen
- Einkommen stabilisieren
- erste Zone vorbereiten

## 5. Zonen

Zonen sind feste quadratische Felder im Grid:

- 2x2
- 4x4
- 6x6
- 8x8

Groessere Zonen sind teurer, eroeffnen aber mehr Topologie und mehr Kombinationsraum.

Zonentyp wird beim Platzieren festgelegt:

- Abbauzone
- Weiterverarbeitungszone
- Herstellungszone

## 6. Kernentscheidung des Spiels

Ab dem ersten Ueberschuss gilt permanent:

- Worker behalten (kurzfristiger Ertrag)
- Worker binden (langfristige Investition)

Zu fruehes Binden schwaecht die Wirtschaft.
Zu spaetes Binden verhindert Infrastruktur.

## 7. Muster -> Objekt

Ab mindestens vier Zellen in einer Zone koennen Verbindungen gelegt werden.
Das System erkennt daraus Muster und erzeugt bei Bestaetigung Objekte/Funktionen.

Prinzip:

- keine Gebaeudeliste klicken
- Funktionen durch Muster entdecken

## 8. Wirtschaftsmodell

Drei Stufen:

1. Abbau
2. Weiterverarbeitung
3. Herstellung

Ziel des Early Games:
Grundversorgung auf Selbsttragfaehigkeit bringen.

## 9. Phasen eines Matches

- Early Game: Ueberleben, erste Stabilisierung, erste Zone
- Mid Game: Teilautomatisierung, freie Zellen fuer Spezialisierung
- Endgame: Produktions- und Militaer-Synergien dominieren

## 10. Konflikt und Niederlage

Konflikt entsteht durch geteilte, wertvolle Ressourcenraeume.
Kein Script-Event muss Kampf kuenstlich starten.

Loss Condition:

- letzte Zelle tot -> Match verloren
- kein Respawn

## 11. Militaerische Entwicklung

Militaer entsteht aus Herstellungsentscheidungen und Kombinationen, nicht nur aus Masse.
Wichtig ist nicht nur "mehr Armee", sondern "andere Armee".

## 12. Visuelle Lesbarkeit

Zellzustaende muessen direkt sichtbar sein (z. B. Marker, Form, Effekte),
damit Micro-Entscheidungen ohne Tooltip-Zwang moeglich sind.

## 13. Matchbogen in einem Satz

Start mit einer Zelle -> Wirtschaft stabilisieren -> Zellen in Muster investieren ->
Objekte und Produktionsketten aufbauen -> Grundversorgung automatisieren ->
Kaempfer spezialisieren -> durch bessere emergente Kombinationen dominieren.

## 14. Technische Leitplanken

- Vanilla JavaScript
- deterministischer Kern
- 24 Ticks pro Sekunde
- UI dispatcht nur, mutiert State nicht direkt
- Replay-/Hash-faehige Zustandsentwicklung

## 15. Ehrlicher Ist-Stand (aktueller Head)

Was bereits belastbar ist:

- deterministische Kernel-/Dispatch-Pipeline
- Tick-Loop ohne dt/catchup-Cap (tick-genauer Catch-up)
- Founder-Budget auf 1 ausgelegt
- UI auf neutralen Adapter reduziert
- Determinismus-/Replay-Testlinie ist aktiv

Was noch fehlt bzw. offen ist:

- renderAlpha-Interpolation sichtbar im Runtime-Flow
- erste klar sichtbare interpolierte Zellbewegung im Browser
- durchgaengiger Worker-Order-Flow (select -> move -> execute) als finaler Gameplay-Standard

## 16. Naechster Fokus

Der naechste Schritt ist nicht Feature-Breite, sondern harte Sichtbarkeit des Kerns:

1. renderAlpha sauber im Live-Rendering verankern
2. 24 Ticks/Sekunde als stabile Basis halten
3. erste interpolierte Zellbewegung sichtbar und testbar machen

---

Repository:

- [Vannon0911/LifeGameLab](https://github.com/Vannon0911/LifeGameLab)

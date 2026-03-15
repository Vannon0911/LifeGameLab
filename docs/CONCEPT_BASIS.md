# Konzeptbasis - LifeGameLab

Zweck dieses Dokuments:
Das ist keine Roadmap und kein Wunschzettel. Es ist die feste Arbeitsgrundlage. Jeder Agent, jedes LLM und jedes spaetere Rework bleibt innerhalb der definierten Produktlogik. Fehlende Systeme werden nicht kreativ erfunden, sondern nachgefragt oder offen gelassen.

## 1. Produktkern

Das Spiel ist ein run-basiertes, deterministisches Struktur- und Aufbauspiel auf einem Raster.

Der Spieler beginnt auf einem kleinen Baugebiet und erweitert dieses schrittweise. Er platziert Zellen, verbindet sie in acht Richtungen mit Nachbarn und erzeugt dadurch Strukturen, Muster, Kombinationen und spaeter Fusionen.

Die zentrale Spielidee ist nicht klassisches Gebaeudebauen, sondern:

> Der Spieler zeichnet funktionale Strukturen, deren Form, Zusammensetzung und Umgebung echte Folgen haben.

Das System soll sich fuer den Spieler offen und experimentell anfuehlen, intern aber auf einem kontrollierbaren Bausteinsystem beruhen.

## 2. Feste Designprinzipien

Diese Punkte sind nicht optional. Alles Weitere baut darauf auf.

Determinismus ist Infrastruktur.
Determinismus ist kein Marketing-Feature, sondern Grundlage fuer Wiederholbarkeit, Testbarkeit, Vergleichbarkeit, Rekonstruktion von Zustaenden, Seeds, Shadows, CPU-Learning und Leaderboards.

Freiheit ohne harte Mauern.
Das Spiel hat keine harte inhaltliche Baugrenze. Die Begrenzung entsteht ueber Kosten, Risiko, Instabilitaet, Ineffizienz und steigende Komplexitaet. Expansion ist niemals gratis.

Form ist Gameplay.
Die Struktur selbst ist bedeutungstragend. Nicht nur was gebaut wird, sondern wie es verbunden ist.

Fehler sollen weh tun.
Falsche Entscheidungen erzeugen reale Nachteile: Ressourcenverlust, Instabilitaet, Kollaps einzelner Strukturen, ineffiziente Builds und verzoegerter Fortschritt. Fehler bedeuten aber nicht standardmaessig sofort Game Over.

Experimentieren soll belohnt werden.
Besonders erste erfolgreiche Experimente duerfen belohnt werden, damit Risiko psychologisch attraktiv bleibt.

Erweiterbarkeit ist Pflicht.
Das Grundsystem muss so angelegt sein, dass spaeter neue Zelltypen, Feldtypen, Muster, Fusionen, Win Conditions, Run-Modifikatoren und CPU-Verhaltensweisen hinzugefuegt werden koennen, ohne die Grundlogik neu zu erfinden.

## 3. Spielerfantasie

> Ich starte mit wenig Raum und wenigen Moeglichkeiten, baue funktionale Muster aus Zellen, entdecke bessere Anordnungen, fusioniere Strukturen zu groesseren Objekten, verdiene mir mehr Bauflaeche und lerne ueber mehrere Runs, wie ich das System besser beherrsche.

Spaeter kommt hinzu:

> Wenn ich immer gleich spiele, lernt das Spiel mich ebenfalls und setzt mich unter Gegendruck.

## 4. Kernobjekte des Systems

Raster:
Primaerer Austragungsort aller Entscheidungen. Jede Zelle liegt auf genau einem Feld.

Felder:
Traeger der Position. Sie koennen unterschiedliche Eigenschaften besitzen. Feldtypen sind Modifikatoren, keine Ersatzmechanik.

Zellen:
Kleinste aktive baubare Einheit. Sie hat mindestens Typ, Zustand, Position, Nachbarschaften, Kosten-/Wertbezug und potenzielle Beteiligung an Mustern oder Fusionen.

Nachbarschaften:
Jede Zelle kann mit allen acht umliegenden Nachbarn verbunden sein. Diese Acht-Richtungs-Nachbarschaft ist fester Kern und darf nicht optional werden.

Muster:
Erkennbare topologische oder kombinatorische Strukturen aus Zellen. Sie entstehen nicht durch UI-Schalter, sondern durch Platzierung und Verbindung.

Fusionen:
Qualitative Zustandswechsel. Mehrere Zellen oder Strukturen werden unter bestimmten Bedingungen zu einem neuen Objekt zusammengefasst.

Objekte:
Hoeherwertige Strukturen aus Fusionen oder besonderen Kombinationen. Keine bloss groesseren Zellen, sondern neue spielerische Zustaende.

## 5. Die Systemgrammatik

Grundformel:

> Zellen + Zelltypen + Nachbarschaft + Feld + Kosten + Zustand + Traits = Effekt, Modifikation oder Fusion

Daraus folgt:
Form allein kann etwas bedeuten. Zelltyp allein kann etwas bedeuten. Feld allein kann etwas beeinflussen. Die staerksten Ergebnisse entstehen aus Kombinationen.

Nicht jede Kombination muss einzigartig sein. Das System soll vielfaeltig wirken, intern aber auf wiederverwendbaren Regeln beruhen.

## 6. Bau- und Expansionslogik

Start:
Kleines Baugebiet, begrenzte Mittel. Zwei sofortige Gefuehle: Raum ist wertvoll. Jede Platzierung zaehlt.

Expansion:
Muss verdient werden. Sie erzeugt immer neue Last: hoehere Baukosten, laengere Versorgungswege, hoehere Instabilitaet und schwerere Optimierbarkeit.

Grundentscheidung:
Die dauerhafte Kernfrage lautet: Verdichten oder erweitern? Diese Spannung darf nie durch triviale Balance zerstoert werden.

## 7. Musterlogik

Muster sollen nicht wie harte Rezeptkarten wirken, sondern wie entdeckbare Strukturregeln.

Ein Muster muss erkennbar, reproduzierbar, systemisch ableitbar, spielerisch relevant und nicht rein kosmetisch sein.

Muster koennen lokale Werte veraendern, Effizienz beeinflussen, Stabilitaet veraendern, Fusionen vorbereiten, Verhalten umlenken, Spezialisierungen ermoeglichen und hoehere Objekte freischalten.

Der Spieler soll fuehlen:
Hier steckt noch mehr drin.
Nicht:
Das Spiel wuerfelt heimlich irgendwas.

## 8. Zelltypen

Zelltypen sind keine kosmetischen Skins. Sie definieren Rollen im System.

Jeder Zelltyp hat mindestens eine klare Funktion: Basisfunktion, Produktionsfunktion, Verbindungsfunktion, Stabilisierungsfunktion, riskante Spezialfunktion, Fusionsfunktion oder Umwandlungsfunktion.

Neue Zelltypen duerfen nur die bestehende Grammatik erweitern, nicht umgehen. Kein neuer Typ darf ein Sondergesetz einfuehren, das alles Bisherige entwertet.

## 9. Fusionen

Fusionen dienen drei Zwecken: spielerischer Fortschritt, visuelle Belohnung und qualitative Systemveraenderung.

Voraussetzungen entstehen aus Form, Zelltypen, Nachbarschaft, Feldbedingungen sowie weiteren Zustaenden oder Schwellen.

Fusionen duerfen staerker sein, neue Funktionen tragen, groessere Flaeche belegen, neue Risiken erzeugen und Folgestrukturen ermoeglichen.

Kollaps ist genauso wichtig. Fehlkombinationen oder Ueberdehnung koennen grosse Objekte zerfallen lassen und Strukturen in kleinere Einheiten zurueckwerfen. Das ist Strafe ohne automatisches Game Over.

## 10. Wirkungsebenen

Kleine Aenderungen:
Lokale Effekte wie kleine Boni/Mali, Reichweite, Durchsatz, Stabilitaet oder Kostenmodifikation.

Mittlere Aenderungen:
Build-praegende Effekte wie Spezialisierung, neue Bauformen und signifikante Trade-offs.

Grosse Aenderungen:
Seltene Systemaenderungen wie neue Objektklassen oder stark verschobene Prioritaeten mit klaren Chancen und Risiken.

Fusionen:
Eigene Kategorie. Qualitative Zustandswechsel, keine blossen Stat-Aenderungen.

## 11. Run-Struktur

Ein Run ist eine abgeschlossene spielerische Einheit. Kein reines Open-End.

Jeder Run braucht einen klaren Start, eine Phase frueher Entscheidungen, eine Phase wachsender Komplexitaet, erkennbare Risiken und ein Ende oder einen klaren Ausgang.

Ein Run soll Raumdruck erzeugen, erste Muster entdecken lassen, mindestens eine echte strategische Weiche erzeugen, den Spieler mit Risiko und Belohnung konfrontieren und zu einem Abschluss fuehren.

## 12. Win Conditions

Win Conditions sind Pflicht. Sie geben dem Run Ziel, Abschluss, Bewertung, Belohnungsgrundlage und Wiederspielwert.

Typ 1: Wachstumsziele.
Sieg durch Entwicklungswert.

Typ 2: Strukturziele.
Sieg durch qualitative Konfiguration.

Typ 3: Stabilitaets- oder Effizienzziele.
Sieg durch kontrollierten Zustand unter Bedingungen.

Win Conditions sollen verschiedene Spielweisen stuetzen, nicht eine einzige Optimalroute.

## 13. Belohnung und Meta-Progression

Zwischen Runs existiert Credits oder eine vergleichbare Meta-Waehrung. Es geht nicht um stumpfe Machtsteigerung, sondern um neue Moeglichkeiten: Zelltypen, Musterklassen, Fusionen, Startoptionen und Run-Modifikatoren.

Meta-Progression soll das System erweitern, nicht entwerten.

## 14. CPU-Learning ueber Runs hinweg

Die CPU erkennt den Stil des Spielers ueber mehrere Runs und reagiert darauf.

Ziel:
Nicht unfair staerker werden, sondern gezielter Gegendruck gegen Gewohnheit.

Was die CPU lernt:
Archetypen wie fruehe oder spaete Expansion, Verdichtung oder Breite, Musterpraeferenzen, Zelltyp-Praeferenzen und Risiko- oder Stabilitaetsprofile.

Wichtige Regel:
Die CPU bestraft Gewohnheit, nicht Kreativitaet. Wiederholte identische Strategien sollen sich zunaechst stark anfuehlen, spaeter aber zunehmend lesbar und konterbar werden.

## 15. Seeds, Vergleichbarkeit und asynchrone Systeme

Determinismus und Run-Struktur erlauben spaeter identische Seeds, faire Vergleichbarkeit, Daily-Challenges, Shadows, Ghost-Runs, Leaderboards und asynchronen Wettbewerb.

Diese Dinge sind Anwendungen des Fundaments. Das Grundspiel darf nicht von ihnen abhaengen.

## 16. Visuelle Richtung

Funktional, klar, guenstig. Reduzierte Darstellung mit Icons, Symbolik, klaren Zustandsanzeigen, Glow, Partikeln und Pulsieren.

Grafik ist Informationstraeger. Schoenheit darf wachsen. Lesbarkeit darf nie geopfert werden.

## 17. Erweiterungslogik

Neue Inhalte fallen immer in bestehende Kategorien: Zelltypen, Feldtypen, Musterregeln, Fusionsregeln, Win Conditions, Unlocks, Run-Modifikatoren und CPU-Gegenprofile.

Die Regel:
Erst pruefen, ob etwas als Baustein in die bestehende Grammatik passt. Nur wenn das unmoeglich ist, darf ein neues System entstehen.

## 18. Was das Spiel ausdruecklich nicht ist

Kein klassischer Gebaeudebuilder. Kein Idle-Game. Keine reine Sandbox ohne Abschluss. Keine Sim-Techdemo. Kein Echtzeit-Multiplayer-Projekt. Kein Roguelike-Klon. Kein Puzzle mit festen Loesungen.

Es ist ein systemisches, run-basiertes Strukturspiel mit freier Kombination und kontrollierter Tiefe.

## 19. Leitfragen fuer neue Ideen

Neue Ideen werden an diesen Fragen geprueft:

- Verstaerkt diese Idee das Bauen von Strukturen oder lenkt sie davon ab?
- Passt sie in die Grammatik aus Zelle, Typ, Feld, Nachbarschaft, Muster und Fusion?
- Erzeugt sie echte Entscheidungen statt nur mehr Effektgewitter?
- Belohnt sie Lernen und Variation?
- Respektiert sie Determinismus und Vergleichbarkeit?
- Unterstuetzt sie Run-Abschluss und Meta-Fortschritt?
- Ist sie erweiterbar, ohne Altlogik zu zerstoeren?

Wenn mehrere Fragen mit Nein beantwortet werden, gehoert die Idee nicht in den Kern.

## Kompakte Kurzfassung

Das Spiel ist ein deterministisches, run-basiertes Struktur- und Aufbauspiel, in dem der Spieler auf engem Raster Zellen in acht Richtungen verbindet, dadurch Muster und Kombinationen erzeugt, Strukturen zu Objekten fusionieren laesst, Expansion gegen Kosten und Risiko abwaegt, ueber Win Conditions Runs abschliesst und ueber mehrere Runs neue Moeglichkeiten freischaltet. Langfristig reagiert eine lernende CPU auf wiederholte Strategien des Spielers und setzt gezielt Gegendruck gegen Gewohnheit.

## Geltungsgrenze

Diese Konzeptbasis ersetzt keine Contract-, Phase- oder Gate-Doku.
Bei Konflikten gilt fuer die operative Umsetzung:

1. Contract- und Kernel-Invarianten
2. aktive Phase-TODOs und Pflicht-Gates
3. diese Konzeptbasis als Produkt- und Designrahmen

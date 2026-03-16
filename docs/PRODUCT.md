# PRODUCT

Version: 1.0

## Produktkern
LifeGameLab ist ein deterministisches Colony-Aufbauspiel fuer kurze Mobile-Sessions.
Der Spieler startet jede Runde mit exakt vier Gruenderzellen, platziert sie bewusst im Grid und baut daraus eine Kolonie, deren Funktionen aus Zelltopologien statt aus klassischen Gebaeuden entstehen.

Jede Runde laeuft unter einem Seed und ist vollstaendig reproduzierbar.
Der Kern des MVP ist nicht maximale Feature-Breite, sondern der Beweis eines starken, wiederholbaren Gameplay-Loops.

## Kernidee
LifeGameLab soll vier Effekte zugleich beweisen:
- Die Gruenderplatzierung fuehlt sich bedeutend an.
- Zellverbindungen erzeugen ueberraschende Funktionen.
- Die CPU wirkt wie ein realer Gegner.
- Nach einer Runde entsteht der Wunsch nach einer zweiten.

Wenn diese vier Punkte nicht erreicht werden, ist das MVP nicht erfolgreich, auch wenn die Technik formal laeuft.

## Designprinzipien

### Determinismus als Infrastruktur
- Gleicher Seed plus gleiche Aktionen muessen zum identischen Ergebnis fuehren.
- Determinismus ist nicht nur Debug-Hygiene, sondern Basis fuer Replays, Leaderboards, Shadow Fights und CPU-Vergleichbarkeit.
- Nicht-deterministische Sonderpfade sind Produktbruch.

### Muster erzeugen Funktionen
- Es gibt keine klassischen Gebaeude als primaere Funktionsquelle.
- Funktionen entstehen aus Zelltyp, Verbindungsrichtung und topologischer Struktur.
- Wichtige Strukturtypen fuer das MVP:
  - lineare Ketten
  - Winkelstrukturen
  - Dreiecke
  - Schleifen
  - groessere Netzwerke

### Strategische Entschleunigung
- Das Spiel beginnt klein und lesbar.
- Wachstum entsteht durch funktionierende Systeme, nicht durch Ressourcen-Spam.
- Expansion ist Konsequenz stabiler Produktion, nicht Knopfdruck-Fuetterung.

### Session-First
- Eine einzelne Runde soll grob zwanzig Minuten tragen.
- Das Ziel ist nicht maximale Sitzungslaenge, sondern ein klarer Wiederspielimpuls nach einem abgeschlossenen Run.

## Spielstart - Genesis
- Der Spieler startet mit einem kleinen Grid und exakt vier Gruenderzellen.
- Ablauf des Starts:
  1. Welt-Preset waehlen
  2. vier Gruenderzellen im Startfenster platzieren
  3. Formation auf Zusammenhang validieren
  4. Formation bestaetigen
- Diese Formation definiert den Energiekern der Kolonie.
- Erst nach dieser Bestaetigung erscheint die CPU-Kolonie deterministisch im gegnerischen Startfenster.
- Der Spieler beginnt immer zuerst.

## Grid und Wachstum
- Das Spielfeld startet bewusst klein.
- Das Grid erweitert sich automatisch, wenn die Kolonie systemisch Druck erzeugt.
- Expansion wird nicht direkt per Button gekauft, sondern aus Koloniezustand abgeleitet.
- Typische Expansionstreiber im MVP:
  - Koloniegroesse
  - Produktionsdruck
  - Energieueberschuss

## Zonenstruktur

### Zone 1 - Energie
- Die Gruenderformation bildet den Energiekern.
- Energie ist primaere Ressource fuer Erhalt, Expansion und Wettbewerbsvergleich gegen die CPU.
- Energieueberschuss gewinnt Zeit.
- Energiedefizit kostet Stabilitaet.

### Zone 2 - DNA
- DNA wird erst bei stabiler Energieproduktion freigeschaltet.
- DNA ist Investitionsressource fuer Technologie, Verbindungsmodifikationen und Musterverstaerkungen.
- DNA soll nicht folgenlos gehortet werden koennen.

### Zone 3+ - Technologie
- Mit wachsender DNA-Akkumulation oeffnen sich Tech-Pfade.
- Der MVP rechnet mit fuenf Entwicklungslinien, die unterschiedliche Spielstile und Schwaechen erzeugen.

## Zellverbindungssystem
- Der Spieler verbindet Zellen ueber Linien.
- Wirkung entsteht aus:
  - Zelltyp
  - Verbindungsrichtung
  - topologischer Struktur
- Wichtige Strukturtypen:
  - lineare Ketten
  - Winkelverbindungen
  - Dreiecke
  - geschlossene Schleifen
  - Netzwerke
- Diese Strukturen sollen emergente Effekte erzeugen.
- Der Spieler lernt die Regeln primar durch Konsequenzen, nicht durch lange Erklaertexte.

## Produktionsketten
- Zellen bilden Produktionsketten statt isolierter Einzelobjekte.
- Beispielrollen fuer den MVP:
  - Energiezellen erzeugen Energie
  - Transportzellen leiten Ressourcen weiter
  - DNA-Zellen erzeugen Investitionsressourcen
  - Tech-Zellen veraendern Systemparameter
- Verbindungen beeinflussen Effizienz und Stabilitaet der Ketten.
- Eine funktionierende Kolonie mit etwa 1200 lebenden Zellen gilt als sichtbarer Stabilitaetsbeweis des Systems.

## CPU-Gegner
- Die CPU startet pro Runde deterministisch aus dem Seed.
- Ihr Grundverhalten muss reproduzierbar sein.
- Zusaetzlich besitzt die CPU ein rundenuebergreifendes Lernsystem, das Spielerstrategien in komprimierter Form aggregiert.
- Das Modell enthaelt acht Dimensionswerte, zum Beispiel:
  - Aggressivitaet
  - Expansionstempo
  - Verbindungskomplexitaet
  - Technologieprioritaet
  - Energieeffizienz
  - DNA-Fokus
  - Risiko-Toleranz
  - defensives Verhalten
- Diese Anpassung soll subtil sein. Die CPU soll glaubwuerdig wirken, nicht wie ein offener Rubber-Band-Trick.

## Async-Multiplayer
- LifeGameLab verzichtet im MVP bewusst auf Echtzeit-Multiplayer.
- Wettbewerb entsteht ueber deterministische Vergleichssysteme.

### Daily Seed
- Pro Tag existiert ein globaler Seed mit identischen Startbedingungen.
- Alle Spieler starten unter denselben Voraussetzungen.

### Leaderboards
- Seed plus Aktionslog muessen einen Endzustand reproduzierbar belegen.
- Leaderboards vergleichen verifizierbare Endzustaende statt bloe Statuswerte.

### Shadow Fights
- Ein Spieler kann gegen den Replay-Geist einer erfolgreichen Runde antreten.
- Beide Runs basieren auf demselben Seed.
- Der Unterschied liegt in den Entscheidungen, nicht in versteckter Varianz.

## Sim-Modus
- Der Sim-Modus ist ein passiver Beobachtungsmodus.
- Er dient als Showcase fuer grosse Kolonien, als Simulationsdemonstration und als visuelles Archiv.
- Er erzeugt keine spielmechanischen Vorteile fuer den Main-Run.

## Plattformstrategie

### Phase 1 - WebApp
- Sofortiger Zugang
- keine Installationsbarriere
- schnelle Validierung des Gameplay-Loops

### Phase 2 - Android APK
- Wrapper um die WebApp fuer fruehe Mobile-Tests
- Distribution ueber alternative Stores
- Fokus auf Feedback und Retention-Daten

### Phase 3 - Google Play
- offizielle Mobile-Verbreitung erst nach validiertem Gameplay-Loop
- iOS ist kein MVP-Ziel und wird erst nach erfolgreicher Mobile-Validierung betrachtet

## Technische Grundlagen

### Deterministische Simulation
- seedbasierter PRNG
- keine nicht-deterministischen Systemaufrufe im Spielkern
- stabile Iterationsreihenfolge

### Replay-System
- Jede Spieleraktion wird protokolliert.
- Ein Replay enthaelt:
  - Seed
  - Aktionssequenz
  - Zeitindex
- Damit muss jede Runde vollstaendig reproduzierbar sein.

### Verifizierbare Endzustaende
- Endzustaende sollen ueber Hashes belegbar sein.
- Das ist die technische Basis gegen Manipulation in Leaderboards und Shadow-Fight-Vergleichen.

## MVP-Beweisziele
Das MVP beantwortet genau diese vier Fragen:
1. Bedeutungsvolle Genesis: Fuehlt sich die Platzierung der vier Gruenderzellen strategisch relevant an?
2. Entdeckungsmechanik: Erleben Spieler ueberraschende Effekte durch Zellverbindungen und Topologien?
3. Glaubwuerdiger Gegner: Wirkt die CPU wie eine echte Kolonie mit eigener Strategie?
4. Wiederspielimpuls: Startet der Spieler freiwillig eine zweite Runde?

Alles Weitere ist Backlog, nicht Kernbeweis.

## Endziel
LifeGameLab soll ein Systemspiel sein.
Es soll nicht primar ueber lange Texte erklaert, sondern ueber Konsequenzen entdeckt werden.
Der Spieler lernt nicht "Regeln", sondern liest Systemverhalten.
Die Kolonie soll sich wie ein groesseres Ganzes anfuehlen als jede einzelne Entscheidung.
Und jede Runde beginnt wieder mit denselben vier Zellen.

## Harte Prioritaet bei Konflikten
1. Contract- und Kernel-Invarianten
2. aktive technische Gates und bindende Arbeitsreihenfolge in `docs/STATUS.md`
3. diese Produktbasis

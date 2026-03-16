# LifeGameLab v0.7.3

![Version](https://img.shields.io/badge/version-0.7.3-0ea5e9)
![Tests](https://img.shields.io/badge/tests-npm%20test-green)
![Repro-Audit](https://img.shields.io/badge/repro-audit%20open-f59e0b)

Deterministisches Zell-Strategieprojekt ueber Kolonieaufbau, Kontrolle, Rework und die langsame Verwandlung eines Sandbox-Prototyps in ein echtes Spiel.

## Die Geschichte dieses Projekts

`LifeGameLab` hat nicht als sauberes Produkt angefangen. Der Kern war zuerst eine experimentelle Zell-Simulation mit vielen direkten Tools, Laborpfaden, Roh-Brushes und Legacy-Aktionen. Das war gut fuer schnelles Ausprobieren, aber schlecht fuer ein echtes Spiel: zu viele Parallelpfade, zu wenig klare Progression, zu viel implizite Logik.

Das aktuelle Projekt ist deshalb ein laufendes Rework mit harter Richtung: weg von der offenen Sandbox, hin zu einem deterministischen Main-Run mit klaren Gates, klaren Phasen und einer vertraglich abgesicherten Architektur. Der Spieler soll nicht hundert Einzelfunktionen spam-klicken, sondern eine Kolonie lesen, stabilisieren und ueber bewusst freigeschaltete Schritte ausbauen.

Kurz gesagt: `LifeGameLab` ist heute nicht nur "ein Zellspiel", sondern die dokumentierte Umstellung eines chaotisch gewachsenen Sim-Prototyps auf ein kontrolliertes, testbares Strategieprodukt.

## W1-Stand 2026-03-16

Der aktuelle Repo-Kern ist auf eine kleine deterministische W1-Linie zurueckgeschnitten:

- keine globale Browser-Debug- oder Store-Surface
- harte Payload-Validierung statt stiller Sonderfelder
- kleiner offizieller Vollpfad ueber `node tools/run-all-tests.mjs --full`
- Rueckverfolgung ueber `docs/traceability/w1-proof-summary.md`

## Was das Spiel heute sein will

`LifeGameLab` ist kein klassisches RTS. Es geht nicht darum, permanent Einheiten zu micro-managen. Die Kolonie handelt in grossen Teilen selbst. Der Spieler arbeitet eher wie ein Operator:

- erst Gruendung
- dann Energiekern
- dann DNA-Zone
- danach Infrastruktur, Sicht, Muster, Progression und spaetere Release-Haertung

Die Leitidee ist: beobachten, verstehen, eingreifen, entblocken. Jeder neue Fortschrittsschritt soll sich wie ein echter Systemwechsel anfuehlen, nicht wie ein weiterer Brush im selben Werkzeugkasten.

Die feste Produktbasis fuer diese Richtung steht in [docs/PRODUCT.md](docs/PRODUCT.md). Das Dokument ist absichtlich enger als ein offenes GDD: Es soll neue Ideen filtern, nicht alles erlauben.

## Warum das Rework noetig war

Vor dem Rework hatte das Projekt mehrere Probleme gleichzeitig:

- Main-Run und Labor-Logik waren zu eng vermischt
- Fortschritt hing zu stark an Altaktionen wie `HARVEST_CELL`
- Doku, UI und eigentliche Sim-Logik drifteten auseinander
- neue Zustandsfelder und Actions konnten zu leicht ohne saubere Contract-Kette wachsen
- viele Systeme waren da, aber die Produktlogik war nicht klar genug

Deshalb wurde das Projekt auf contract-first umgebaut. Neue Actions und State-Felder muessen erst durch Manifest, Schemas, Mutation-Matrix, Sim-Gate und Dataflow, bevor sie als "echtes Feature" gelten. Das klingt trocken, ist aber der Grund, warum das Rework ueberhaupt beherrschbar bleibt.

## Was heute real schon da ist

Der aktuelle Head ist nicht mehr nur Konzept. Ein erheblicher Teil des neuen Spiels lebt bereits im Code:

- deterministischer Kernel mit harten Manifest-/Schema-/Mutation-Gates
- preset-gebundene Worldgen mit `river_delta`, `dry_basin`, `wet_meadow`
- klare Main-Run-Raeume `lage`, `eingriffe`, `evolution`, `welt`, `labor`
- Genesis-Start ohne Auto-Founder im Standardmodus
- Founder-Phase mit explizitem Confirm
- zweite Confirm-Stufe fuer den Energiekern
- DNA-Unlock-Meter, DNA-Setup, DNA-Commit und deterministische DNA-Erzeugung
- Advisor-/Read-Model als gemeinsame Truth fuer HUD, Textdiagnose und Status
- Quick-/Truth-/Stress-Suiten statt einem unsortierten Testhaufen

Das Projekt steht also nicht an Punkt null. Es hat bereits einen echten spielbaren Run-Kern, aber noch nicht den gesamten geplanten Produktbogen.

## Wie die Entwicklungsphasen erzaehlt werden koennen

Die momentane Entwicklung laesst sich als Abfolge von Emanzipationsschritten lesen:

### Phase A

Aus der freien Sandbox wird ein echter Genesis-Start. Keine Auto-Founder mehr, kein heimlicher Sim-Fortschritt, sondern ein bewusster Run-Beginn.

### Phase B

Die Gruendung allein reicht nicht mehr. Der Energiekern wird zum ersten echten Commitment. Erst danach beginnt der aktive Lauf und die CPU bekommt ihren kontrollierten Bootstrap.

### Phase C

Die Kolonie ist nicht mehr nur "lebendig", sondern beginnt sich als zweite eigene Zone zu organisieren. Die DNA-Zone ist der erste echte Ausbau jenseits des Kerns.

### Phase D bis G

Der Block ist nicht mehr nur Zukunft, sondern weitgehend im Baum:

- `Phase D`: Infrastruktur, aktive Sicht und Fog sind produktiv
- `Phase E`: kanonisches Zonensystem und Pattern-Engine sind produktiv
- `Phase F`: Tech-Gates, Progression und Result-Only-Losepfade sind produktiv
- `Phase G`: Cleanup, Balancing und RC-Haertung bleiben der naechste offene Release-Block

Diese Phasen sind nicht nur Ideen, sondern ueber Ticket-, Gate- und Integrity-Doku abgesichert.

## Produkt-Highlights Im Aktuellen Zustand

- Mobile-first Shell mit Bottom-Dock + Sheet, Desktop als Mission-Control
- Klare Top-Signale: `Kolonie`, `DNA`, `Risiko`, `Run-Pfad`, `Engpass`
- Deterministischer Advisor fuer Run-Pfad, Blocker und naechsten Ausbauhebel
- Sichtbare Strukturreife von Einzelzellen ueber Gruendung bis zu Kern- und DNA-Zone
- Echte Diagnose-Scanner fuer `energy`, `toxin`, `nutrient`, `territory`, `conflict`
- Keine globalen Browser-Debug- oder Store-Hooks mehr im Live-Client

## Rueckverfolgbarkeit

- Produkt-/Status-Truth: `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`
- Aktueller kanonischer Vollbeleg: `docs/traceability/w1-proof-summary.md`

## Schnellstart

```bash
npm test
py -m http.server 8080
```

Dann im Browser öffnen: `http://127.0.0.1:8080/`

Optional:

```bash
npm run serve
npm run test:quick
npm run test:truth
npm run test:stress
```

## Steuerung

- `Leertaste`: Start/Pause
- `N`: neue Welt
- `S`: Status öffnen
- `E`: Evolution öffnen
- Maus/Touch: Werkzeuge, Split-Seeds, Zonen

## Qualitätsgates

- `npm test` = Quick-Suite (truth/stress bewusst aus, um grosse Testlaeufe nicht implizit zu triggern)
- `node tools/run-all-tests.mjs --full` = offizieller W1-Vollbeleg
- Keine Zufallsquellen außerhalb Kernel-RNG
- State-Änderungen nur via `dispatch()` + Patches
- Contract-Tests für String-/Dataflow-/Wrapper-Hardening aktiv

## Repo-Struktur

- `src/app/` Bootstrap + Loop
- `src/core/` deterministischer Kernel + Runtime
- `src/game/` Sim, Renderer, UI
- `src/project/` Manifest + projektseitige Entry-Points
- `tests/` Gates, Determinismus, Gameplay, Contracts
- `tools/` Runner, Gate- und schlanke Hilfswerkzeuge
- `docs/` vier kanonische Top-Level-Dokumente plus `docs/llm/`

## Aktueller Engineering-Status (ehrlich)

- Contract-/Gate-Haertung ist umgesetzt und testgruen.
- `Phase A-F` leben auf Codebasis.
- `Phase G` ist der aktive Block fuer Cleanup, Balance und RC-Haertung.
- Der aktuelle W1-Kern ist belegt; weitergehende fachliche Bereiche muessen noch in denselben kleinen Beweisstil ueberfuehrt werden.
- Performance-Ziel und finale Release-Haertung sind weiter offen.

## Was noch fehlt

Das Projekt ist noch kein "fertiges Release-Spiel". Es ist ein fortgeschrittenes Rework mit klarem Kurs. Die grossen offenen Bloecke sind:

- Perf-Budgets sauber messen und halten
- Presets balancieren
- weitere fachliche Bereiche ohne Sonderpfade in die W1-Truth ueberfuehren
- Migration-Sicherheit und finale RC-Haertung abschliessen

## Wenn du das Repo lesen willst

Die beste Lesart ist nicht "welche Datei macht was?", sondern:

1. Was war frueher Sandbox/Legacy?
2. Was ist heute kanonischer Main-Run?
3. Welche Phase ist abgeschlossen?
4. Welche Phase ist nur vorbereitet?
5. Welche Wahrheit ist Contract, welche nur Altlast?

Die wichtigsten Anker dafuer sind:

- `docs/WORKFLOW.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/STATUS.md`
- `docs/traceability/w1-proof-summary.md`
- `docs/llm/ENTRY.md`

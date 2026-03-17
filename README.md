# LifeGameLab

> Diese Repo-Seite beschreibt den aktuellen Head `0.7.3` und die reale Umbaugeschichte seit dem ersten Commit.
> Alte `v2.5.0`-/`v2.6.0`-Erzaehlungen, Screens und Sandbox-Beschreibungen sind historische Zwischenstaende, nicht die aktuelle Produktwahrheit.

## Was dieses Projekt gerade ist

LifeGameLab ist aktuell ein deterministisches Colony-Aufbauspiel im aktiven MVP-Umbau.
Der Produktkern am aktuellen Head ist:

- vier Gruenderzellen als bewusster Genesis-Start
- Funktionen aus Zelltopologien statt aus klassischen Gebaeuden
- seedbasierte, reproduzierbare Runs
- eine CPU-Kolonie als echter Gegner
- Async-Wettbewerb ueber Daily Seeds, Leaderboards und Shadow Fights
- ein Spiel, das ueber Konsequenzen entdeckt wird, nicht ueber lange Erklaertexte

Die kanonische Produktbeschreibung liegt in [docs/PRODUCT.md](docs/PRODUCT.md).

## Ehrlicher Head-Status

Der aktuelle Stand ist kein fertiges Release-Spiel.
Er ist eine gehaertete technische Basis plus ein klarer aktiver Bauplan.

Was am Head bereits belastbar ist:

- deterministischer Kernel
- manifest-first Contracts
- patch-only State-Mutationen
- UI/Renderer bleiben read-only gegen Gameplay-State
- harte Determinismus- und Contract-Gates
- reduzierte W1-Proof-Linie fuer die Vor-MVP-Baseline

Was gerade aktiv gebaut wird:

- der bindende MVP-Feature-Complete-Block `A1 -> A2 -> A3 -> B1 -> B2 -> B3 -> C1 -> C2 -> C3 -> C4`
- neue Genesis-/CPU-/Topologie-/Summary-Logik auf Basis des aktuellen Produktkonzepts

Die operative Wahrheit dazu liegt in [docs/STATUS.md](docs/STATUS.md).

## Wahrheitsquellen

Wenn du das Repo verstehen willst, lies in dieser Reihenfolge:

1. [docs/PRODUCT.md](docs/PRODUCT.md)
   Das Zielbild des Spiels.
2. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
   Die aktuelle technische Snapshot-Wahrheit.
3. [docs/STATUS.md](docs/STATUS.md)
   Der aktive Bauplan, die Gates und die dokumentierte Change-Historie.
4. [docs/WORKFLOW.md](docs/WORKFLOW.md)
   Der kanonische Arbeits- und Governance-Einstieg.

## Technische Grundregeln

Diese Regeln sind am aktuellen Head nicht optional:

- keine direkten Gameplay-State-Schreibpfade ausserhalb von `dispatch()` plus Patches
- Manifest-, Schema-, Mutation- und Gate-Kette bleiben Pflicht
- keine nicht-deterministischen Quellen in Reducer oder SimStep
- UI und Renderer duerfen Gameplay-State nicht heimlich veraendern
- neue Felder und Actions sind erst echt, wenn Contract und Gates sie offiziell tragen

Die Details stehen in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) und unter [src/project/contract/](src/project/contract/).

## Schnellstart

```bash
npm run serve
```

Dann im Browser oeffnen:

```text
http://127.0.0.1:8080/
```

Wichtige Verifikationskommandos:

```bash
node tools/run-all-tests.mjs --full
node tests/test-contract-no-bypass.mjs
node tests/test-deterministic-genesis.mjs
node tests/test-sim-gate-contract.mjs
node tests/test-llm-contract.mjs
```

## Repo-Struktur

- `src/app/`
  Bootstrap und Runtime-Hooks
- `src/core/`
  deterministischer Kernel, Patches, RNG, Runtime
- `src/game/`
  Simulation, Renderer und UI
- `src/project/`
  Contracts, Manifest, LLM-/Governance-Glue
- `tests/`
  Determinismus-, Contract- und Gate-Beweise
- `tools/`
  Test-Suiten, Preflight, Evidence, Hilfswerkzeuge
- `docs/`
  kanonische Produkt-, Architektur-, Status- und Workflow-Doku

## Was in der Repo-Historie wirklich passiert ist

Dieses Repo hat sich mehrfach neu geschnitten.
Die Geschichte seit dem ersten Commit ist nicht "Feature fuer Feature", sondern "Umbau fuer Umbau".

### 1. Ursprung: Sim-Prototyp und schnelles Basteln

Startpunkt war [`f9f077b`](../../commit/f9f077b) am 2026-03-14.
Die fruehen Commits bauten zunaechst einen experimentellen Zell-/Sim-Prototypen mit UI-Arbeit, Testschleifen, Screens und fruehen README-Varianten.

Repraesentative Spuren:

- [`f9f077b`](../../commit/f9f077b) initialer Core-/Sim-Start
- [`c73927d`](../../commit/c73927d) und [`56ed006`](../../commit/56ed006) erste GitHub-/UI-Praesentation
- [`43fc6d3`](../../commit/43fc6d3) alte `v2.5.0`-Erzaehlung

### 2. Der erste harte Schnitt: Contract- und Gate-Disziplin

Noch am 2026-03-14 wurde das Projekt stark modularisiert und contract-first umgebaut.
Der Fokus wanderte weg vom losen Experiment hin zu kontrollierter, deterministischer Architektur.

Repraesentative Spuren:

- [`8c1c225`](../../commit/8c1c225) Modularisierung von Contract-/LLM-/Reducer-Architektur
- [`ad770d3`](../../commit/ad770d3) gate-strikte Contracts und Entfernung des Sim-Wrappers
- [`825c712`](../../commit/825c712) Split von Runtime/UI/Sim-Phasen plus Determinismus-Haertung
- [`a264025`](../../commit/a264025) LLM-Preflight- und Task-Entry-Dokumentation

### 3. Phasen A-C: Genesis, Core, DNA als erster Main-Run-Bogen

Danach wurde ein frueher Progressionspfad aufgebaut: Founder-/Genesis-Flow, Energiekern, DNA-Zone, dazu passende Tests und Doku.
Das war die erste ernsthafte Form eines Main-Runs.

Repraesentative Spuren:

- [`9b0b17a`](../../commit/9b0b17a) Genesis-Bootstrap und Founder-Gating
- [`ddbf315`](../../commit/ddbf315) B3-Arbeit
- [`f389f41`](../../commit/f389f41) Phase-B-Ende Richtung C
- [`44f7d24`](../../commit/44f7d24) "C done" im damaligen Schnitt

### 4. Phase-D/E/F-Ausbau, Merge-Wellen und alter v2.x-Rahmen

Am 2026-03-14 und 2026-03-15 liefen viele Integrationen und Merge-Historien zusammen.
Dabei wurden Infrastruktur-, Zonen-, Fog-, UI- und Testpfade mehrfach umgebaut.
Die alten `v2.6.0`-README- und Rework-Erzaehlungen stammen aus genau dieser Phase.

Repraesentative Spuren:

- [`3fcc826`](../../commit/3fcc826) Infra-Staging-Fix und Sync auf `v2.6.0`
- [`c455e18`](../../commit/c455e18) Zone-Basis und Fog-Invarianten
- [`0199a64`](../../commit/0199a64) Migration auf kanonische Zonenreads
- [`bd68781`](../../commit/bd68781) damaliges "E done"
- [`2534b00`](../../commit/2534b00) damaliges "F green"
- [`58135b7`](../../commit/58135b7) alter Uebergang nach Phase G

### 5. Cleanup, Repo-Konsolidierung und Versionsschnitt auf `0.7.3`

Danach wurde das Projekt radikal verkleinert und auf eine haertere Truth-Linie gezogen.
Alte Debug-Surfaces, Legacy-Artefakte und breite Repo-Flaechen wurden entfernt oder entwertet.
Die Versionsgeschichte sprang bewusst von den alten `2.x`-Narrativen auf `0.7.3`.

Repraesentative Spuren:

- [`498d429`](../../commit/498d429) Konsolidierung der Repo-Doku
- [`dd71c77`](../../commit/dd71c77) grosses Cleanup
- [`d22613b`](../../commit/d22613b) Versionsschnitt auf `0.7.3`
- [`188ff18`](../../commit/188ff18) Entry-Naming und Backup-Audit

### 6. W1-Repro-Audit: dispatch-only Truth statt Debug-Spielplatz

Am 2026-03-16 wurde die technische Wahrheit nochmals haerter geschnitten.
Das Repo verlor bewusst viele Legacy-/Debug-/Labor-Surfaces und konzentrierte sich auf eine kleine, beweisbare W1-Linie.

Repraesentative Spuren:

- [`34ae543`](../../commit/34ae543) Legacy-Suite ersetzt durch dispatch-only Evidence-Gates
- [`32b2023`](../../commit/32b2023) Entfernung von Lab- und Buffer-Mutationspfaden
- [`015cc3a`](../../commit/015cc3a) Entfernen globaler UI-/Debug-Surfaces
- [`a0fa261`](../../commit/a0fa261) Repo-Cut auf Core-Tools und deterministische Tests
- [`e05aa6f`](../../commit/e05aa6f) und [`fc5c7eb`](../../commit/fc5c7eb) Sim-Gate- und Testhaertung

### 7. Aktueller Pivot: MVP-Konzept neu gesetzt, Status darauf umgebogen

Die juengsten Commits markieren den aktuellen Kurs:
weg von der alten Phase-G-/v2.x-Erzaehlung, hin zu einem klaren Mobile-MVP mit vier Gruenderzellen, Topologie-Funktionen, CPU-Gegner und Wiederspielimpuls.

Repraesentative Spuren:

- [`09bd9d1`](../../commit/09bd9d1) `STATUS` auf den bindenden MVP-Plan `A1-C4` umgestellt
- [`1a6ff76`](../../commit/1a6ff76) `PRODUCT` auf das neue MVP-Konzept umgeschrieben

## Was bewusst nicht mehr die Wahrheit ist

Diese Punkte tauchen in aelteren Commits, Screens oder README-Staenden auf, sind aber nicht mehr die verlaessliche Head-Erzaehlung:

- alte `v2.5.0`-/`v2.6.0`-Versionsnarrative
- GitHub-Screens aus frueheren Sandbox-/Rework-Zwischenstaenden
- globale Browser-Debug-Hooks als offizieller Produktbestandteil
- die Annahme, dass Phase-G-RC-Haertung noch die aktive Hauptarbeit sei

## Was als naechstes zaehlt

Das Repo ist aktuell dann ehrlich gelesen, wenn du es so verstehst:

- Die technische Basis ist bewusst hart und klein gehalten.
- Die Produktwahrheit wurde juengst neu gesetzt.
- Der aktive Wert liegt jetzt nicht in mehr Altbestand, sondern in sauberer Umsetzung des MVP-Blocks `A1-C4`.

Wenn du an der Codebasis arbeitest, starte nicht mit Dateiscanning, sondern mit den vier kanonischen Dokumenten unter [`docs/`](docs/).

# Phase D TODO

Zweck: Infrastruktur und aktive Sicht/Fog-Regeln nach stabiler DNA-Zone.

## Status

- Phase D ist abgeschlossen.
- D1-D8 sind auf Codebasis, Doku und Gates nachgezogen.
- Phase E ist der naechste produktive Block.
- Nicht in D2 enthalten:
  - kein aktives Fog-Produktivcode
  - keine CPU-Informationsumschaltung
  - keine UI-/Renderer-Umschaltung

## Zielbild

- Infrastruktur wird echte Main-Run-Handlung.
- Sicht/Fog wird aktiv genutzt.
- entfernte Entwicklung wird an Verbindung gebunden.
- CPU ist nur dort praezise sichtbar, wo Sicht besteht.
- zukuenftige Remote-Zonen haengen an Netzwerk + Sicht.

## Harte Reihenfolge

1. Phase C vollstaendig und stabil mergen.
2. Phase D nur auf stabiler C-Basis starten.
3. Kein D-Produktivcode, solange C nicht stabil ist.

## Ticket-Reihenfolge

### D1 Contract-/State-Basis
- [x] `sim.infrastructureUnlocked` ergaenzen
- [x] `sim.infraBuildMode` ergaenzen
- [x] `sim.infraBuildCostEnergy` ergaenzen
- [x] `sim.infraBuildCostDNA` ergaenzen
- [x] `BEGIN_INFRA_BUILD` ergaenzen
- [x] `BUILD_INFRA_PATH` ergaenzen
- [x] `CONFIRM_INFRA_PATH` ergaenzen
- [x] `visibility/explored` aktiv vertraglich nutzen
- [x] Contracts/Gates/Metrics/Assertions updaten
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-freeze-contract.mjs`
  - `node tests/test-sim-gate.mjs`
  - `node tests/test-dataflow-contract.mjs`
  - `node tests/test-string-contract.mjs`

### D2 Infrastruktur-Bauen
- [x] Pfad-Build semantisch statt Brush
- [x] legale Tiles definieren
- [x] Commit auf `world.link`
- [x] Energie-/DNA-Kosten
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-begin-infra-build.mjs`
  - `node tests/test-build-infra-path.mjs`
  - `node tests/test-confirm-infra-path.mjs`
  - `node tools/run-test-suite.mjs quick`

### D3 Sicht-/Fog-System
- [x] Sicht durch Kernzone
- [x] Sicht durch DNA-Zone
- [x] Sicht durch Infrastruktur
- [x] `explored` fuellen
- [x] unsichtbare Bereiche entpraezisieren
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-visibility-fog.mjs`
  - `node tests/test-confirm-infra-path.mjs`
  - manuelle Gegenproben:
    - Overlap Core+DNA liefert unionsartige Sicht ohne Sonderfall-Drift (`visibleTiles=18`)
    - frische `GEN_WORLD`-Welt startet wieder mit leerem `explored` (`freshExplored=0`)
    - stabiler lebender Infra-Zweitick haelt committed Link bei `1.000`

### D4 CPU-Informationsgating
- [x] CPU in Sicht praezise
- [x] CPU ausserhalb Sicht unpraezise/signaturhaft
- [x] keine KI-Rewrite-Logik
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-cpu-visibility-gating.mjs`
  - `node tests/test-overlay-diagnostics.mjs`
  - `node tests/test-ui-strategy-contract.mjs`
  - manuelle Gegenproben:
    - Signaturfall redaktiert `cpuAlive` zu `null` und setzt `blockerCode=cpu_intel_limited`
    - sichtbarer CPU-Fall bleibt praezise (`cpuAlive=1`)
    - Feldfarben staffeln sichtbar `visible -> memory -> hidden` (`38,91,77 | 37,48,54 | 7,10,15`)

### D5 Verbindungsregeln
- [x] entfernte Ausbaupfade an Link/Sicht koppeln
- [x] keine dritte Zone voll bauen
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-remote-reachability-gates.mjs`
  - `node tests/test-standard-dna-flow.mjs`
  - manuelle Gegenproben:
    - Standard sichtbar aber unangebunden blockt weiter (`standardVisibleUnanchoredSplit=0`)
    - `LAB_AUTORUN`-`SET_ZONE` bleibt erlaubt (`labZoneAllowed=1`)

### D6 UI-Minimum
- [x] Infrastrukturmodus
- [x] Pfadvorschau
- [x] Kostenanzeige
- [x] Sichtdarstellung
- [x] Blocker-Hinweise
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-genesis-ui-minimum.mjs`
  - `node tests/test-ui-contract.mjs`
  - `node tests/test-ui-strategy-contract.mjs`
  - manuelle Gegenproben:
    - leerer Infra-Confirm bleibt expliziter Exit statt stiller No-Op (`infraBuildMode=""`, `running=true`, Abort-Text sichtbar)
    - Canvas-Klicks ausserhalb `infraBuildMode` bleiben auf bestehende Brush-Logik begrenzt (`staged: 0 -> 0`)
    - Welt-Panel zeigt Fog-Legende, ohne Labor-Overlay in den Main-Run zu ziehen (`Sichtbar: 22`, `Erkundet: 4`, `Unbesucht: 230`)

### D7 Caller/Smokes
- [x] Standard-Smokes um Infrastruktur-/Sicht-Schritt ergaenzen
- [x] `DNA -> Infra`-Flow absichern
- [x] Lab-/Recovery-/Benchmark-Pfade gegen Regression pruefen
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-standard-infra-flow.mjs`
  - `node tests/test-smoke.mjs`
  - `node tests/test-main-runtime-callers.mjs`
  - manuelle Gegenproben:
    - Browser-Laborpfad startet Benchmark weiter ohne Fog-/UI-Absturz (`Benchmark start` geloggt, keine `console.error`)
    - Standard-Infra-Probe vergroessert Sicht und behaelt `explored` nach Leitungsverlust

### D8 Finalisierung
- [x] technische Notizen / Changelog aktualisieren
- [x] TODO-/Implementierungsstatus aktualisieren
- [x] Versioning-/LLM-Gates am Phase-D-Ende nachziehen (`llm-preflight classify/ack/check`, `LLM_ENTRY`-Sync falls noetig)
- [x] Scope-Check: kein Pattern-/Zone-/Tech-Grossumbau
- Verifiziert mit:
  - `node tests/test-version-traceability.mjs`
  - `npm run test:quick`
  - `npm run test:truth`
  - Scope-Gegenprobe:
    - kein neues Pattern-System
    - kein finales Zonensystem
    - kein Tech-Tree-/Objective-Rework
    - keine Contract-/Schema-Erhoehung

## Zielzustand nach Phase D

- vor Infrastruktur-Unlock:
  - `runPhase = RUN_ACTIVE`
  - `coreZoneMask` aktiv
  - `dnaZoneMask` aktiv
  - `playerDNA` waechst deterministisch
  - `nextZoneUnlockKind = "INFRA"`
- nach Infrastruktur-Unlock:
  - Infrastruktur-Bau ist explizit startbar
  - `world.link` wird kanonischer Infrastrukturtraeger
  - Sicht/Fog werden aktiv gefuellt
  - entfernte Ausbauschritte koennen Verbindung/Sicht verlangen
  - CPU wird nur in sichtbaren Bereichen praezise dargestellt
- Result:
  - alle Infra-Build-/Sicht-Aktionen sind No-Op in `RESULT`

## Phase-D-Preset-Erweiterungen

Jedes Preset bekommt:

```js
phaseD: {
  infraBuildCostEnergy: 10,
  infraBuildCostDNA: 8,
  visionRadiusCore: 2,
  visionRadiusDNA: 2,
  visionRadiusInfra: 1
}
```

## Harte Nicht-Ziele

- kein Pattern-System
- kein finales Zonensystem
- kein Tech-Tree-Rework
- keine Auto-Expansion
- kein CPU-KI-Rewrite
- keine dritte Zone als volles Content-System
- keine Preset-Explosion
- keine Kernel-Aenderung

## D1-Abschluss

- Neue Sim-Felder sind im Contract, Reducer-Default und `simGate`.
- Neue Infra-Actions existieren als contract-synchrone No-Op-Surface.
- `phaseD`-Presetbasis fuer Kosten und Sichtweiten ist angelegt.
- `CONFIRM_DNA_ZONE` zieht die D1-Kostenbasis bereits deterministisch aus dem Preset nach.
- Infrastruktur-Bau, Sicht/Fog-Logik, UI und Renderer bleiben bewusst fuer D2-D6 offen.

## D2-Abschluss

- Infrastruktur nutzt jetzt einen eigenen Staging-Pfad ueber `world.infraCandidateMask`.
- `BEGIN_INFRA_BUILD` wechselt in einen semantischen Pfadmodus statt Brush-/Zone-Paint.
- `BUILD_INFRA_PATH` erlaubt nur zusammenhaengende, lebende, player-owned Netzpfade mit Anker an Kern, DNA oder bestehendem Link.
- `CONFIRM_INFRA_PATH` committed erst dann nach `world.link`, verbraucht DNA- und Energiekosten deterministisch und setzt `infrastructureUnlocked=true`.
- Leerer `CONFIRM_INFRA_PATH` gilt als expliziter Exit aus dem Pfadmodus, startet den Run wieder und laesst Netzwerk- sowie Ressourcenwerte unveraendert.
- Sicht/Fog, CPU-Informationsgating und UI bleiben bewusst offen fuer D3-D6.

## D3-Implementierungsstand

- `runWorldSystemsPhase()` berechnet `world.visibility` jetzt pro aktivem Tick neu aus lebenden player-owned Tiles in `coreZoneMask`, `dnaZoneMask` und committed `world.link`.
- Die Sicht nutzt deterministische Kreis-Radien aus `phaseD.visionRadiusCore`, `phaseD.visionRadiusDNA` und `phaseD.visionRadiusInfra`.
- `world.explored` wird monoton aus aktueller Sicht gefuellt und bis Reset/Weltneubau behalten.
- Committed Infrastruktur bleibt als `world.link === 1` stabil; driftende Social-Links werden fuer Spieler-Infrastruktur unterhalb der committed Schwelle gehalten, damit Sicht nicht an zufaellige Linkwerte koppelt.
- Zwei Gegenproben haben absichtlich falsche Annahmen aufgedeckt und die D3-Absicherung geschaerft:
  - CPU-Linkwerte sind numerisch nicht stabil genug fuer harte Sicht-Assertions; fachlich relevant bleibt nur, dass sie keine Spieler-Sicht leaken.
  - isolierte Infra-Tiles verlieren ihren Link korrekt beim Zelltod; Stabilitaet muss daher mit lebendem Pfad, nicht mit isoliertem Einzel-Tile belegt werden.

## D4-Implementierungsstand

- Renderer nutzt jetzt `visibility/explored` aktiv: sichtbare Tiles bleiben praezise, `explored`-Tiles werden farblich degradiert, nie gesehene Tiles stark verdunkelt.
- CPU-Zellen ausserhalb aktueller Sicht werden nicht mehr praezise gezeichnet; in `explored` bleiben nur signaturhafte Marker, in ungesehenen Bereichen nichts.
- `window.render_game_to_text()` zieht jetzt eine fog-aware Read-Summary, inklusive `cpuIntel`.
- UI-Statuskarten zeigen keine global exakten CPU-Zahlen mehr, wenn keine praezise Sicht besteht.
- KI-/Sim-Verhalten bleibt unveraendert; das Gating sitzt nur in Read-/Render-Pfaden.
- Ein D4-Regressionstest hat aufgedeckt, dass Diagnosepfade ohne Fog-Arrays sonst pauschal als `hidden` wuerden; Default ist deshalb jetzt bewusst `visible`, solange keine Fog-Daten existieren.

## D5-Implementierungsstand

- `PLACE_SPLIT_CLUSTER` verlangt im Standard-Run jetzt sichtbare Zielkacheln plus sicht-/netzgebundenen Anker an Kern, DNA oder committed Infrastruktur.
- `SET_ZONE` akzeptiert im Standard-Run keine blinden Fernmarkierungen mehr; Mittelpunkt muss sichtbar und an Kern/DNA/committed Infra gekoppelt sein.
- Lab-/Legacy-Pfade bleiben unangetastet; es gibt bewusst kein neues Remote-Content-System und keine dritte Zone.
- Eine Gegenprobe hat gezeigt, dass `SET_ZONE` nicht nur den Mittelpunkt, sondern den gesamten Ziel-Footprint gegen Sicht+Anker pruefen muss; der Guard folgt jetzt derselben Footprint-Logik wie `PLACE_SPLIT_CLUSTER`.

## D6-Implementierungsstand

- `ui.js` bietet jetzt im `lage`-Panel einen echten Infra-Minimalflow: Start-CTA, staged Pfadzaehler, Kostenanzeige, Confirm-CTA und klare Abort-/Blockertexte.
- Solange `sim.infraBuildMode === "path"` ist, werden Canvas-Klicks semantisch auf `BUILD_INFRA_PATH` umgelenkt; ausserhalb davon bleibt die bestehende Brush-/Run-Logik unveraendert.
- Das aktive Tool meldet im HUD jetzt explizit den Infrastrukturpfad und den staged Stand.
- `lage` und `welt` zeigen Sicht-/Fog-Status als Main-Run-Leseschicht; die Renderer-Abstufung aus D3/D4 bleibt der visuelle Source of Truth.
- `src/project/contract/dataflow.js` fuehrt die drei Infra-Actions jetzt auch formal als UI-Dispatch-Quellen, damit Manifest und reale UI-Callpaths wieder deckungsgleich sind.

## D7-Implementierungsstand

- Neuer Standard-Smoke `tests/test-standard-infra-flow.mjs` fuehrt den kanonischen Pfad jetzt bis zum ersten Infra-Commit und prueft Sichtgewinn plus `explored`-Persistenz nach Leitungsverlust.
- `tests/test-smoke.mjs` behandelt `visibility/explored` jetzt auch im `LAB_AUTORUN` als feste Invariante: tile-aligned Arrays und saubere Fog-Partition ohne Drift.
- `tests/test-main-runtime-callers.mjs` bleibt der leichte Guard dafuer, dass Bootstrap, Recovery und Benchmark ihre expliziten Lab-/Genesis-Caller nicht verlieren.
- Manuell ist der Labor-Benchmarkpfad erneut angerissen: Start-Event kommt hoch, Fog-UI erzeugt keine `console.error`, und es tauchen keine `undefined`-/`NaN`-Artefakte im Paneltext auf.

## D8-Implementierungsstand

- Release-/Governance-Artefakte sind auf `v2.7.0` synchronisiert (`package.json`, Manifest, README, `index.html`, Snapshot-/Log-Doku).
- `docs/SESSION_HANDOFF.md` und `docs/PROJECT_STRUCTURE.md` fuehren Phase D jetzt als abgeschlossene Codebasis und benennen Phase E explizit als naechsten Block.
- `docs/PHASE_D_TODO.md` ist damit nicht mehr Arbeitsliste fuer offene Produktivarbeit, sondern abgeschlossener Nachweis fuer Infrastruktur + aktive Sicht/Fog.
- Abschlusslaeufe `quick` und `truth` sind nach D7/D8 erneut gruen; `SCHEMA_VERSION` blieb unveraendert bei `2`, also kein Major-Fall.

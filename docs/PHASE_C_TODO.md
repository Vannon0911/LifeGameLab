# Phase C TODO

Zweck: DNA-Zone als echter zweiter Spielschritt nach stabilem Energiekern.

## Status

- Produktiv geblockt bis Phase B sauber und stabil abgeschlossen ist.
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Smoke-Vorbereitung
  - UI-Textslots und Read-Model-Platzhalter vorbereiten
- Nicht erlaubt vor Produktivstart:
  - kein `DNA_ZONE_SETUP`-Produktivcode
  - kein `dnaZoneMask`-Produktivcode
  - kein Infrastruktur-Bau
  - kein aktives Fog

## Zielbild

- `Zone 2: DNA` wird sichtbar freischaltbar.
- DNA-Setup wird explizit gestartet.
- DNA-Zone wird explizit gesetzt und bestaetigt.
- bestaetigte DNA-Zone erzeugt deterministisch DNA.
- naechster sichtbarer Pfad zeigt auf Infrastruktur, baut sie aber nicht.

## Harte Reihenfolge

1. B3/B4/B5/B6/B7/B8/B9 sauber beenden.
2. Phase C nur vorbereiten oder in isolierten Prep-Tickets anfassen.
3. Phase C vollstaendig mergen.
4. Phase D erst auf stabiler C-Basis mergen.

## Ticket-Reihenfolge

### C1 Contract-/State-Basis
- [x] `RUN_PHASE.DNA_ZONE_SETUP` einfuehren
- [x] `world.dnaZoneMask` ergaenzen
- [x] `sim.zone2Unlocked` ergaenzen
- [x] `sim.zone2PlacementBudget` ergaenzen
- [x] `sim.dnaZoneCommitted` ergaenzen
- [x] `sim.nextInfraUnlockCostDNA` ergaenzen
- [x] `START_DNA_ZONE_SETUP` ergaenzen
- [x] `TOGGLE_DNA_ZONE_CELL` ergaenzen
- [x] `CONFIRM_DNA_ZONE` ergaenzen
- [x] Contracts/Gates/Metrics/Assertions updaten
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-freeze-contract.mjs`
  - `node tests/test-sim-gate.mjs`
  - `node tests/test-confirm-core-zone.mjs`
  - `node tests/test-dataflow-contract.mjs`
  - `node tests/test-manifest-dataflow.mjs`
  - `node tests/test-string-contract.mjs`

### C2 DNA-Setup starten
- [x] `START_DNA_ZONE_SETUP` nur bei vollem DNA-Meter
- [x] `RUN_ACTIVE -> DNA_ZONE_SETUP`
- [x] `running=false`
- [x] `zone2Unlocked=true`
- [x] Placement-Budget aus Preset
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-start-dna-zone-setup.mjs`
  - `node tests/test-sim-gate.mjs`
  - `node tools/run-test-suite.mjs quick`

### C3 DNA-Placement
- [x] nur alive + player-owned
- [x] Overlap mit `coreZoneMask` blockieren
- [x] max 4 Tiles
- [x] Adjazenzregel `touch_core_or_owned`
- [x] Removal vor Confirm
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-toggle-dna-zone-cell.mjs`
  - `node tools/run-test-suite.mjs quick`

### C4 DNA-Commit
- [x] `CONFIRM_DNA_ZONE` validiert Komponente/Ownership/Adjazenz/Budget
- [x] `dnaZoneMask` committen
- [x] `dnaZoneCommitted=true`
- [x] `unlockedZoneTier=2`
- [x] `nextZoneUnlockKind=INFRA`
- [x] `nextInfraUnlockCostDNA` aus Preset
- [x] `RUN_ACTIVE + running=true`
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-confirm-dna-zone.mjs`
  - `node tests/test-sim-gate.mjs`
  - `node tools/run-test-suite.mjs quick`

### C5 Passive DNA-Erzeugung
- [x] committed DNA-Zone erhoeht `playerDNA` deterministisch
- [x] keine neue Ressource
- [x] `dnaYieldScale` aus Preset optional
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-confirm-dna-zone.mjs`
  - `node tools/run-test-suite.mjs quick`

### C6 DNA-Setup-Gates
- [x] Main-Run-Actions blockieren
- [x] `SIM_STEP`/`APPLY_BUFFERED_SIM_STEP`/`TOGGLE_RUNNING` blockieren
- [x] `PLACE_CELL` blockieren
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-dna-zone-setup-gates.mjs`
  - `node tools/run-test-suite.mjs quick`

### C7 UI-Minimum
- [x] Status `DNA-Zone setzen`
- [x] Placement-Zaehler `0/4`
- [x] Button `DNA-Zone bestaetigen`
- [x] Play/Step deaktivieren oder Hinweis
- [x] Post-Commit: `Zone 2 aktiv`
- [x] `Naechster Unlock: Infrastruktur`
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-genesis-ui-minimum.mjs`
  - `node tests/test-ui-contract.mjs`
  - `node tools/run-test-suite.mjs quick`

### C8 Caller/Smokes
- [x] Standard-Smokes um DNA-Schritt ergaenzen
- [x] `Foundation -> Core -> DNA -> Run` absichern
- [x] Lab-/Recovery-/Benchmark-Pfade gegen Regression pruefen
- [x] Tests + Doku aktualisieren
- Verifiziert mit:
  - `node tests/test-standard-dna-flow.mjs`
  - `node tests/test-main-runtime-callers.mjs`
  - `node tools/run-test-suite.mjs quick`

### C9 Finalisierung
- [x] technische Notizen / Changelog aktualisieren
- [x] TODO-/Implementierungsstatus aktualisieren
- [x] Scope-Check: kein Infrastruktur-/Pattern-/Fog-/Tech-Rework

## Phase-C-Abschluss

- [x] `C1` Contract-/State-Basis
- [x] `C2` DNA-Setup starten
- [x] `C3` DNA-Placement
- [x] `C4` DNA-Commit
- [x] `C5` Passive DNA-Erzeugung
- [x] `C6` DNA-Setup-Gates
- [x] `C7` UI-Minimum
- [x] `C8` Caller/Smokes
- [x] `C9` Finalisierung
- Phase C ist damit fachlich und prozessual abgeschlossen.

## Zielzustand nach Phase C

- vor DNA-Unlock:
  - `runPhase = RUN_ACTIVE`
  - `running = true`
  - `world.coreZoneMask` existiert
  - `unlockedZoneTier = 1`
  - `nextZoneUnlockKind = "DNA"`
  - `zoneUnlockProgress` laeuft
  - CPU ist einmalig gebootstrappt
- nach `START_DNA_ZONE_SETUP`:
  - `runPhase = DNA_ZONE_SETUP`
  - `running = false`
  - `zone2Unlocked = true`
  - `world.dnaZoneMask` ist leer
  - `zone2PlacementBudget = 4`
  - nur `CONFIRM_DNA_ZONE` fuehrt zurueck nach `RUN_ACTIVE`
- nach `CONFIRM_DNA_ZONE`:
  - `runPhase = RUN_ACTIVE`
  - `running = true`
  - `world.dnaZoneMask` markiert exakt die bestaetigte DNA-Komponente
  - `unlockedZoneTier = 2`
  - `dnaZoneCommitted = true`
  - `nextZoneUnlockKind = "INFRA"`
  - `nextInfraUnlockCostDNA` ist gesetzt
  - DNA-Zone erhoeht `playerDNA` deterministisch

## Phase-C-Preset-Erweiterungen

Jedes Preset bekommt:

```js
phaseC: {
  dnaPlacementBudget: 4,
  nextInfraUnlockCostDNA: 30,
  dnaZoneAdjacencyRule: "touch_core_or_owned",
  dnaYieldScale: 1.0
}
```

## Harte Nicht-Ziele

- kein allgemeines Zonensystem
- kein finales `ZONE_ROLE`-System
- kein Pattern-System
- kein Infrastruktur-Bau
- kein Fog-/Visibility-Gameplay
- kein Tech-Tree-Rework
- kein Progressions-Rewrite
- keine Auto-Expansion
- keine Preset-Sonderhoelle
- keine Kernel-Aenderung

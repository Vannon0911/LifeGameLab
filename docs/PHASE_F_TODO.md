# Phase F TODO

Zweck: P1-Progression auf stabiler Phase-E-Basis umsetzen, ohne neue Parallel-Systeme.

## Status

- Phase E ist am 2026-03-15 produktiv abgeschlossen.
- `tests/test-phase-e-integrity.mjs` existiert, ist in `truth` registriert und laeuft gruen.
- Phase F ist am 2026-03-15 produktiv umgesetzt und testgruen auf `main`.
- Verifiziert gruen:
  - `npm run test:quick`
  - `npm run test:truth`
  - `node tests/test-phase-f-progression-integrity.mjs`
  - `node tests/test-phase-f-loss-modes.mjs`
- `tests/test-phase-f-progression-integrity.mjs` ist in `truth` registriert.
- Freigegebene Folgephase: Phase G.
- P1-Startvoraussetzungen:
  - [x] Phase D abgeschlossen
  - [x] Phase E liefert kanonisch: `world.zoneRole`, `world.zoneId`, `world.zoneMeta`, `sim.patternCatalog`, `sim.patternBonuses`
  - [x] `tests/test-phase-e-integrity.mjs` ist gruen
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Smoke-Vorbereitung
  - Versioning-/Entry-Sync fuer Phase F
- Nicht erlaubt vor Produktivstart:
  - kein neuer Unlock-Store
  - keine neue Ressource/Currency
  - keine neue Action-Familie
  - kein CPU-Rewrite

## Zielbild (P1)

- Bestehende Tech-IDs und Lane-Strings bleiben erhalten.
- `BUY_EVOLUTION` bleibt bestehender Pfad, aber mit zusaetzlichen Run-Gates.
- `deriveStageState()` bleibt einzige Stage-Authority und monoton.
- `applyWinConditions()` bleibt einziger Result-Resolver.
- Read-Model bleibt Single-Source (`buildAdvisorModel()` + Read-Model-Sektionen).

## Harte Reihenfolge

1. Phase E vollstaendig und stabil mergen.
2. `tests/test-phase-e-integrity.mjs` muss existieren und gruen laufen.
3. P1 danach atomar in genau dieser Reihenfolge ausfuehren:
   - F1 `docs/PHASE_F_TODO.md` synchronisieren
   - F2 `src/game/contracts/ids.js`
   - F3 `src/game/techTree.js`
   - F4 `src/game/sim/playerActions.js`
   - F5 `src/game/sim/reducer/winConditions.js`
   - F6 `src/game/sim/reducer/progression.js`
   - F7 `src/game/ui/ui.model.js` + `src/project/llm/advisorModel.js`
   - F8 Tests
3. Je Subtask Pflichtablauf aus `START_HERE`: `classify -> ack -> check`.
4. `tests/test-phase-f-progression-integrity.mjs` ist Pflicht-Gate vor Phase-G-Start.

## Ticket-Reihenfolge

### F1 Versioning-Sync (vor Produktivcode)
- [x] `docs/PHASE_F_TODO.md` bleibt auf P1-E-Basis synchron
- [x] "keine neuen Lanes/ID-Migration" als feste Scope-Regel verankern
- [x] TODO-/Prompt-/Testmatrix auf P1-Grenzen ausrichten

## Files To Touch (P1, final)

- `src/game/contracts/ids.js` -> neue `WIN_MODE`-IDs
- `src/game/techTree.js` -> statische `runRequirements` pro Tech
- `src/game/sim/playerActions.js` -> `handleBuyEvolution()` um `runRequirements` erweitern
- `src/game/sim/reducer/winConditions.js` -> neue Result-only-Losepfade
- `src/game/sim/reducer/progression.js` -> `deriveStageState()` um Post-E-Gates erweitern
- `src/game/ui/ui.model.js` -> UI-Labels fuer neue Loss-Conditions
- `src/project/llm/advisorModel.js` -> Result-Reason-Labels / blocked-tech reasons
- `docs/PHASE_F_TODO.md` -> Governance-Sync

## Files Not To Touch (P1, hart)

- `src/game/sim/reducer/techTreeOps.js`
- `src/project/contract/stateSchema.js`
- `src/game/sim/reducer/index.js` fuer keinen Strukturumbau; nur minimale Callsite-Durchleitung ist toleriert
- `src/core/kernel/*`
- `src/game/render/*`
- `src/project/contract/manifest.js`

### F2 Contracts (klein halten)
- [x] `WIN_MODE` um Result-only Lose-Ausgaben erweitern: `core_collapse`, `vision_break`, `network_decay`
- [x] `WIN_MODE_SELECTABLE` unveraendert lassen
- [x] keine neuen waehllosen `WIN_MODE`-Pfade; nur Result-only-Losewerte
- [x] `runRequirements` als statisches Feld an bestehenden Tech-Entries ergaenzen
- [x] keine neuen Action-Typen, kein neues Sim-Feld fuer Loss-Reason

### F3 Tech-Gates auf bestehendem Pfad
- [x] `handleBuyEvolution()` erzwingt weiterhin DNA-Kosten, Stage, Prereqs, `commandReq`
- [x] zusaetzlich `runRequirements` erzwingen
- [x] `runRequirements` lebt in `src/game/techTree.js`, nicht im Laufzeit-State
- [x] kein neuer Resolver, kein neuer Store, nur Lesezugriffe auf bestehende State-Felder
- [x] Gate-Regeln auf die real vorhandenen Tech-IDs/Lanes gemappt und ueber statische `runRequirements` abgebildet:
  - `metabolism`: ab Stage 2 committed DNA-Zone; ab Stage 4 zusaetzlich positiver Pattern-Energie- oder DNA-Bonus
  - `survival`: ab Stage 2 Infrastruktur; ab Stage 3 zusaetzlich Defense-Aktivierung oder positiver Defense-/Stability-Bonus
  - `cluster`: ab Stage 2 mindestens eine Pattern-Klasse + `networkRatio >= 0.10`; ab Stage 4 mindestens zwei Pattern-Klassen
  - `growth`: ab Stage 2 `expansionCount >= 1` oder sinnvoller Expansion-Progress; ab Stage 3 Infrastruktur; Stage 5 `expansionCount >= 2`
  - `evolution`: Infrastruktur + mindestens drei Pattern-Klassen + positiver DNA-/Stability-Bonus

### F4 Stage-Authority + Goals/Results
- [x] `deriveStageState()` bleibt alleinige Stage-Quelle; kein `patternScore`
- [x] Pattern-Einfluss nur auf `stabilityScore`
- [x] bestehende Gewichte/Monotonie behalten, zusaetzliche Gates:
  - Stage 3 erfordert committed DNA-Zone
  - Stage 4 erfordert Infrastruktur-Unlock
  - Stage 5 erfordert gefundene Pattern + positiven Pattern-Bonus + weiterhin kein Collapse/Kritikrisiko
- [x] Preset-Bias vor bestehendem Goal-Fallback:
  - `river_delta` -> Bias auf `EXPANSION` bei stabilem Network/Infra
  - `dry_basin` -> Bias auf `SURVIVE_ENERGY` und `HARVEST_SECURE`
  - `wet_meadow` -> Bias auf `GROWTH` und `EVOLUTION_READY`
- [x] `goal` bleibt Run-Target; Loss-Reason nur als Result-only `winMode`

### F5 Apply-Win + Post-E Signale
- [x] `applyWinConditions()` bleibt einziger Resolver und schreibt bei Lose:
  - `gameResult = LOSS`
  - `winMode = core_collapse | vision_break | network_decay`
  - `gameEndTick`
  - `running = false`
  - `runPhase = RESULT`
- [x] Lose-Detektion nur aus post-E kanonischen Signalen:
  - Core-Extinction aus kanonischer Core-Zonen-Belegung
  - Vision-Break aus committed kanonischen Zonen plus `visibility/explored`
  - Network-Decay aus kanonischen Infra-Zonen plus Netzwerk/Infrastruktur-Status
- [x] `SET_ZONE`/`zoneMap` bleiben lab-only/legacy und sind keine Main-Run-Wahrheit mehr
- [x] keine neue Loss-Reason im State; `winMode` bleibt Result-only-Transport

### F6 Read-Model / Advisor (Single Truth)
- [x] `runIdentity`: Preset-ID ergaenzen, Doctrine/WinMode beibehalten
- [x] `status`: `stageProgressScore`, Infrastrukturstatus, Pattern-Count, Pattern-Bonus-Summary, kanonische Zonen-Summary ergaenzen
- [x] `advisor`: blocked-tech reasons + Result-Reason-Label aus Result-only `winMode`
- [x] keine zweite Read-Model-Quelle aufbauen

### F7 Testing + Gate
- [x] `tests/test-phase-f-progression-integrity.mjs` anlegen und in `truth` aufnehmen
- [x] Beweise in F7-Gate:
  - deterministische Progression
  - monotones `playerStage`
  - post-E Signale wirken auf Progression
  - Altmetriken allein treiben Stage nicht
  - Preset-Goal-Bias reproduzierbar
  - Lose-Resolution deterministisch auf neue Result-only `winMode`-Werte
- [x] bestehende Tests erweitern:
  - Freeze-Progression (Telemetry-only reicht weiter nicht)
  - Result-Phase (neue Lose-Werte stabil in `RESULT`)
  - Advisor/Read-Model-Contract (neue Felder ohne zweite Wahrheit)
  - Gameplay-Loop (`BUY_EVOLUTION` + Lineage-Memory + Gates)
  - Contract/String/Sim-Gate bleiben gruen
- [x] Suite-Registry: `test-phase-e-integrity.mjs` und `test-phase-f-progression-integrity.mjs` in `truth`

### F8 Finalisierung
- [x] `progress.md` aktualisieren
- [ ] `docs/MASTER_CHANGE_LOG.md` aktualisieren
- [x] `docs/SESSION_HANDOFF.md` nachziehen
- [x] Scope-Check: kein neuer Content-Berg

## Pflicht-Gate Nach Phase F

- Datei: `tests/test-phase-f-progression-integrity.mjs`
- Suite: `truth`
- Pflichtbeweise:
  - gleiche Unlock-Inputs => identische Progression
  - `playerStage` bleibt monoton
  - post-E Signale schlagen durch, Altmetriken alleine nicht
  - Preset-Bias bleibt reproduzierbar
  - Lose-Resolution bleibt deterministisch auf Result-only `winMode`

## Harte Nicht-Ziele

- kein neuer Content-Berg
- keine neue CPU-Architektur
- kein Renderer-Grundumbau
- keine Preset-Explosion
- kein Reducer-Split in `src/game/sim/reducer/index.js` waehrend Phase F

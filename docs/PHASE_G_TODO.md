# Phase G TODO

Zweck: Balance, Cleanup und RC-Haertung.

## Status

- Produktiv strikt gesperrt bis Phase F stabil voll gemerged ist.
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Release-Checklist-Vorbereitung
  - RC-Testdesign und Suite-Einordnung vorbereiten
  - Balance-Checklisten formulieren
- Nicht erlaubt vor Produktivstart:
  - keine neuen Kernfeatures
  - keine neue Zone
  - keine neuen Presets
  - kein Sim-Mode-Revival im Main-Run

## Zielbild

- Legacy-Reste im Main-Run sind minimiert.
- Vollsuiten und Perf-Budgets sind gruen.
- Presets sind auf Release-Niveau balanciert.
- Doku und Release-Checklist bilden den finalen RC-Stand ab.

## Harte Reihenfolge

1. Phase F vollstaendig und stabil mergen.
2. Phase G nur auf stabiler F-Basis starten.
3. `tests/test-release-candidate-integrity.mjs` ist Pflicht-Gate fuer RC-Abnahme.

## Ticket-Reihenfolge

### G1 Cleanup
- [ ] alte Main-Run-Zweige loeschen
- [ ] tote Renderzweige loeschen
- [ ] Legacy im Main-Run minimieren
- [ ] Tests + Doku aktualisieren

### G2 Vollsuite
- [x] `quick` gruen
- [ ] `truth` gruen
- [ ] `stress` gruen
- [x] `playwright` gruen
- [ ] `determinism-long` gruen
- [ ] Perf-Budgets einhalten

### G3 Balance
- [ ] `river_delta` balancieren
- [ ] `dry_basin` balancieren
- [ ] `wet_meadow` balancieren
- [ ] Unlock-Pacing pruefen
- [ ] Lose-Fairness pruefen

### G4 Doku-Finish
- [ ] `MANDATORY_READING` aktualisieren
- [ ] `LLM_ENTRY` aktualisieren
- [ ] `SESSION_HANDOFF` aktualisieren
- [ ] `PROJECT_STRUCTURE` aktualisieren
- [ ] `PROJECT_CONTRACT_SNAPSHOT` aktualisieren
- [ ] TODO / Changelog finalisieren

### G5 Release-Checklist
- [x] clean boot
- [x] new run flow
- [x] lab path intact
- [ ] migration safe
- [x] smoke green
- [ ] perf within budget

### G6 RC-Gate-Test
- [x] `tests/test-release-candidate-integrity.mjs` anlegen
- [ ] in `truth` oder `full` registrieren

## Pflicht-Gate Nach Phase G

- Datei: `tests/test-release-candidate-integrity.mjs`
- Pflichtbeweise:
  - Clean Boot funktioniert reproduzierbar
  - Main-Run-Flow bleibt intakt
  - Labor-/Recovery-/Migration-Pfade bleiben intakt
  - finale Smoke-/Perf-Gates sind gruen

## Harte Nicht-Ziele

- keine neuen Kernfeatures
- keine neue Zone
- keine neuen Presets
- kein Achievement-Kram
- kein Sim-Mode-Revival im Main-Run

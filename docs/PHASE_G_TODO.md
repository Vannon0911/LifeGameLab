# Phase G TODO

Zweck: Balance, Cleanup und RC-Haertung.

## Status

- Phase F ist am 2026-03-15 produktiv abgeschlossen; Phase G ist damit freigegeben.
- Gegenprobe am 2026-03-15: `npm run test:quick`, `npm run test:truth`, `node tests/test-phase-f-progression-integrity.mjs` und `node tests/test-release-candidate-integrity.mjs` laufen gruen.
- `tests/test-release-candidate-integrity.mjs` ist jetzt in `truth` registriert und laeuft dort gruen mit.
- `tests/test-phase-f-progression-integrity.mjs` ist jetzt ebenfalls in `truth` registriert und laeuft dort gruen mit.
- Erlaubt vor Produktivstart:
  - G1 Cleanup
  - G2 Vollsuite + Perf-Budgets
  - G3 Balance
  - G4/G5 Doku- und Release-Haertung
- Harte Startbedingung bleibt:
  - keine neuen Kernfeatures ausser G-Cleanup/RC-Haertung
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
- [x] `truth` gruen
- [ ] `stress` gruen
- [x] `playwright` gruen
- [x] `determinism-long` gruen
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
- [x] in `truth` oder `full` registrieren

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

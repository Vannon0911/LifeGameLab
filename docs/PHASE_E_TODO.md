# Phase E TODO

Zweck: kanonisches Zonensystem und deterministische Pattern-Engine nach stabilem D-Stand.

## Status

- Phase E ist am 2026-03-15 produktiv umgesetzt und testgruen auf `main`.
- Verifiziert gruen:
  - `npm run test:quick`
  - `npm run test:truth`
  - `node tests/test-phase-e-integrity.mjs`
- Freigegebene Folgephase: Phase F.

## Zielbild

- Spezialmasken werden in ein kanonisches Zonensystem ueberfuehrt.
- Patterns werden deterministisch erkannt und ausgewertet.
- Doppelwahrheiten zwischen Spezialmasken und kanonischen Zonen enden.
- Main-Run bleibt deterministisch und testbar.

## Harte Reihenfolge

1. Phase D vollstaendig und stabil mergen.
2. Phase E nur auf stabiler D-Basis starten.
3. `tests/test-phase-e-integrity.mjs` ist Pflicht-Gate vor Phase-F-Start.

## Ticket-Reihenfolge

### E1 Contract-/State-Basis
- [x] `ZONE_ROLE` eingefuehrt
- [x] `world.zoneRole` ergaenzt
- [x] `world.zoneId` ergaenzt
- [x] `world.zoneMeta` ergaenzt
- [x] `sim.patternCatalog` ergaenzt
- [x] `sim.patternBonuses` ergaenzt
- [x] Contracts/Gates/Metrics/Assertions aktualisiert
- [x] Tests + Doku aktualisiert

### E2 Migration Core/DNA/Infra
- [x] `coreZoneMask` in kanonische Zonen ueberfuehrt
- [x] `dnaZoneMask` in kanonische Zonen ueberfuehrt
- [x] Infra-Commit in kanonische Zonen ueberfuehrt
- [x] Main-Run-Sicht/Fog und DNA-Ertrag lesen kanonische Zonen statt Legacy-Masken
- [x] Tests + Doku aktualisiert

### E3 Pattern-Engine
- [x] Linien erkennen
- [x] Bloecke erkennen
- [x] Schleifen erkennen
- [x] Verzweigungen erkennen
- [x] Dichtecluster erkennen
- [x] deterministisch bleiben
- [x] Recalc an Commit-/Expand-Trigger haengen
- [x] Tests + Doku aktualisieren

### E4 Effekt-Resolver
- [x] Pattern -> Energie
- [x] Pattern -> DNA
- [x] Pattern -> Stabilitaet
- [x] Pattern -> Sicht
- [x] Pattern -> Defense/Transport
- [x] Tests + Doku aktualisieren

### E5 Preset-Bias
- [x] Pattern-Biases je Preset ergaenzt
- [x] keine Weltlogik-Explosion
- [x] Tests + Doku aktualisieren

### E6 UI / Read-Model
- [x] kanonische Zonen-Summary im Advisor-/Read-Model ergaenzt
- [x] Pattern-Lesbarkeit im Advisor-/Read-Model ergaenzt
- [x] `advisorModel` / `readModel` nachgezogen
- [x] keine zweite Diagnosequelle aufgebaut
- [x] Tests + Doku aktualisieren

### E7 Caller/Smokes
- [x] bestehende Core/DNA/Infra-Smokes auf kanonische Nachweise erweitert
- [x] Lab-/Bootstrap-/Advisor-Szenarien gegen Regression geprueft
- [x] Tests + Doku aktualisieren

### E8 Post-E-Gatekeeper-Test
- [x] `tests/test-phase-e-integrity.mjs` angelegt
- [x] in `truth`-Suite aufgenommen
- [x] `Genesis -> Core -> DNA -> Infra -> Zone/Pattern` deterministisch abgesichert

### E9 Finalisierung
- [x] `progress.md` aktualisiert
- [x] `docs/SESSION_HANDOFF.md` nachgezogen
- [x] Scope-Check bestanden: kein F-/G-Vorgriff, kein Kernel-Rewrite

## Pflicht-Gate Nach Phase E

- Datei: `tests/test-phase-e-integrity.mjs`
- Suite: `truth`
- Pflichtbeweise:
  - gleicher Seed + gleiche Actions => identische `zoneRole`, `zoneId`, `zoneMeta`
  - identischer `patternCatalog`
  - identische `patternBonuses`
  - identische Endsignatur
  - Core/DNA/Infra korrekt migriert
  - keine Doppelquelle im Main-Run aktiv

## Ergebnis

- Phase E ist abgeschlossen.
- Phase F ist jetzt produktiv freigegeben.

## Harte Nicht-Ziele

- kein Tech-Tree-Rework
- kein Objective-/Win-/Lose-Rework
- kein Balance-Pass
- kein CPU-KI-Rewrite
- keine Kernel-Aenderung

# Phase E TODO

Zweck: kanonisches Zonensystem und deterministische Pattern-Engine nach stabilem D-Stand.

## Status

- Phase D ist stabil abgeschlossen; Phase E darf auf dieser Basis produktiv anlaufen.
- Aktueller Stand: E1 und E2 sind erledigt, E3+ bleiben offen.
- Weiterhin nicht erlaubt ausserhalb der jeweiligen Tickets:
  - keine Migration von `coreZoneMask` / `dnaZoneMask` / `world.link` vor E2
  - keine Pattern-Auswertung vor E3/E4
  - keine UI-/Read-Model-Aktivierung vor E6

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
- [x] `ZONE_ROLE` einfuehren
- [x] `world.zoneRole` ergaenzen
- [x] `world.zoneId` ergaenzen
- [x] `world.zoneMeta` ergaenzen
- [x] `sim.patternCatalog` ergaenzen
- [x] `sim.patternBonuses` ergaenzen
- [x] Contracts/Gates/Metrics/Assertions updaten
- [x] Tests + Doku aktualisieren

E1 ist bewusst nur die Basis:
- neue Contract-/State-Felder sind vorhanden und durch Gates/Bootstrap abgesichert
- `GEN_WORLD`/Expansion preserven die neuen Felder deterministisch
- keine Core-/DNA-/Infra-Migration und keine Pattern-Berechnung in diesem Ticket

### E2 Migration Core/DNA/Infra
- [x] `coreZoneMask` in kanonische Zonen ueberfuehren
- [x] `dnaZoneMask` in kanonische Zonen ueberfuehren
- [x] Infra-Sonderpfade in kanonische Zonen ueberfuehren
- [x] Doppelquellen im Main-Run entfernen
- [x] Tests + Doku aktualisieren

E2 ist bewusst als Migrationsschritt umgesetzt:
- `world.zoneRole` / `world.zoneId` / `world.zoneMeta` spiegeln jetzt Core, DNA und committed Infra deterministisch
- Main-Run-Leser fuer Sicht/Fog, Reachability und DNA-Ertrag lesen kanonische Zonen statt der alten Doppelquellen
- `coreZoneMask`, `dnaZoneMask` und `link` bleiben vorerst als Kompatibilitaets-/Staging-Flaechen erhalten, bis E3+ sie weiter abbauen

### E3 Pattern-Engine
- [ ] Linien erkennen
- [ ] Bloecke erkennen
- [ ] Schleifen erkennen
- [ ] Verzweigungen erkennen
- [ ] Dichtecluster erkennen
- [ ] deterministisch bleiben
- [ ] Recalc nur auf sinnvolle Trigger haengen
- [ ] Tests + Doku aktualisieren

### E4 Effekt-Resolver
- [ ] Pattern -> Energie
- [ ] Pattern -> DNA
- [ ] Pattern -> Stabilitaet
- [ ] Pattern -> Sicht
- [ ] Pattern -> Defense/Transport
- [ ] Tests + Doku aktualisieren

### E5 Preset-Bias
- [ ] Pattern-Biases je Preset ergaenzen
- [ ] keine Weltlogik-Explosion
- [ ] Tests + Doku aktualisieren

### E6 UI / Read-Model
- [ ] Zoneninspektion
- [ ] Pattern-Lesbarkeit
- [ ] `renderer.js` / `ui.js` / `ui.model.js` / `readModel` / `advisorModel` nachziehen
- [ ] keine Diagnose-Excel
- [ ] Tests + Doku aktualisieren

### E7 Caller/Smokes
- [ ] C/D-Smokes auf kanonische Zonen anpassen
- [ ] Lab gegen Regression pruefen
- [ ] Tests + Doku aktualisieren

### E8 Post-E-Gatekeeper-Test
- [ ] `tests/test-phase-e-integrity.mjs` anlegen
- [ ] in `truth`-Suite aufnehmen
- [ ] `Genesis -> Core -> DNA -> Infra -> Zone/Pattern` deterministisch absichern

### E9 Finalisierung
- [ ] `progress.md` aktualisieren
- [ ] `docs/MASTER_CHANGE_LOG.md` aktualisieren
- [ ] `docs/SESSION_HANDOFF.md` nachziehen
- [ ] Scope-Check: kein Tech-/Objective-/Balance-Rework

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

## Harte Nicht-Ziele

- kein Tech-Tree-Rework
- kein Objective-/Win-/Lose-Rework
- kein Balance-Pass
- kein CPU-KI-Rewrite
- keine Kernel-Aenderung

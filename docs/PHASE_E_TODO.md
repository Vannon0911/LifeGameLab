# Phase E TODO

Zweck: kanonisches Zonensystem und deterministische Pattern-Engine nach stabilem D-Stand.

## Status

- Produktiv strikt gesperrt bis Phase D stabil voll gemerged ist.
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Smoke-Vorbereitung
  - Integritaetstest-Design fuer Phase E vorbereiten
  - Read-Model-/UI-Slots benennen, aber nicht produktiv aktivieren
- Nicht erlaubt vor Produktivstart:
  - kein kanonisches Zonensystem im Produktivcode
  - kein Pattern-Produktivcode
  - keine Migration von `coreZoneMask` / `dnaZoneMask` / `world.link`

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
- [ ] `ZONE_ROLE` einfuehren
- [ ] `world.zoneRole` ergaenzen
- [ ] `world.zoneId` ergaenzen
- [ ] `world.zoneMeta` ergaenzen
- [ ] `sim.patternCatalog` ergaenzen
- [ ] `sim.patternBonuses` ergaenzen
- [ ] Contracts/Gates/Metrics/Assertions updaten
- [ ] Tests + Doku aktualisieren

### E2 Migration Core/DNA/Infra
- [ ] `coreZoneMask` in kanonische Zonen ueberfuehren
- [ ] `dnaZoneMask` in kanonische Zonen ueberfuehren
- [ ] Infra-Sonderpfade in kanonische Zonen ueberfuehren
- [ ] Doppelquellen im Main-Run entfernen
- [ ] Tests + Doku aktualisieren

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

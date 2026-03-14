# Phase D TODO

Zweck: Infrastruktur und aktive Sicht/Fog-Regeln nach stabiler DNA-Zone.

## Status

- Produktiv strikt geblockt bis Phase C stabil voll gemerged ist.
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Smoke-Vorbereitung
  - UI-Textslots und Read-Model-Platzhalter vorbereiten
  - Caller-/Smoke-Tabellen vorbereiten
- Nicht erlaubt vor Produktivstart:
  - kein Infrastruktur-Bau-Produktivcode
  - kein aktives Fog-Produktivcode
  - kein D-Produktivcode ueberhaupt

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
- [ ] `sim.infrastructureUnlocked` ergaenzen
- [ ] `sim.infraBuildMode` ergaenzen
- [ ] `sim.infraBuildCostEnergy` ergaenzen
- [ ] `sim.infraBuildCostDNA` ergaenzen
- [ ] `BEGIN_INFRA_BUILD` ergaenzen
- [ ] `BUILD_INFRA_PATH` ergaenzen
- [ ] `CONFIRM_INFRA_PATH` ergaenzen
- [ ] `visibility/explored` aktiv vertraglich nutzen
- [ ] Contracts/Gates/Metrics/Assertions updaten
- [ ] Tests + Doku aktualisieren

### D2 Infrastruktur-Bauen
- [ ] Pfad-Build semantisch statt Brush
- [ ] legale Tiles definieren
- [ ] Commit auf `world.link`
- [ ] Energie-/DNA-Kosten
- [ ] Tests + Doku aktualisieren

### D3 Sicht-/Fog-System
- [ ] Sicht durch Kernzone
- [ ] Sicht durch DNA-Zone
- [ ] Sicht durch Infrastruktur
- [ ] `explored` fuellen
- [ ] unsichtbare Bereiche entpraezisieren
- [ ] Tests + Doku aktualisieren

### D4 CPU-Informationsgating
- [ ] CPU in Sicht praezise
- [ ] CPU ausserhalb Sicht unpraezise/signaturhaft
- [ ] keine KI-Rewrite-Logik
- [ ] Tests + Doku aktualisieren

### D5 Verbindungsregeln
- [ ] entfernte Ausbaupfade an Link/Sicht koppeln
- [ ] keine dritte Zone voll bauen
- [ ] Tests + Doku aktualisieren

### D6 UI-Minimum
- [ ] Infrastrukturmodus
- [ ] Pfadvorschau
- [ ] Kostenanzeige
- [ ] Sichtdarstellung
- [ ] Blocker-Hinweise
- [ ] Tests + Doku aktualisieren

### D7 Caller/Smokes
- [ ] Standard-Smokes um Infrastruktur-/Sicht-Schritt ergaenzen
- [ ] `DNA -> Infra`-Flow absichern
- [ ] Lab-/Recovery-/Benchmark-Pfade gegen Regression pruefen
- [ ] Tests + Doku aktualisieren

### D8 Finalisierung
- [ ] technische Notizen / Changelog aktualisieren
- [ ] TODO-/Implementierungsstatus aktualisieren
- [ ] Scope-Check: kein Pattern-/Zone-/Tech-Grossumbau

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

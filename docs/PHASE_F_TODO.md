# Phase F TODO

Zweck: Tech-Tree, Progression und Objectives auf das Rework ausrichten.

## Status

- Produktiv strikt gesperrt bis Phase E stabil voll gemerged ist.
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Smoke-Vorbereitung
  - Progressions-/Objective-Testdesign vorbereiten
  - UI-/Advisor-Slots benennen ohne Produktivumschaltung
- Nicht erlaubt vor Produktivstart:
  - kein produktiver Tech-Tree-Rewrite
  - kein produktives Objective-/Lose-Rework
  - keine Vorab-Migration alter Progressionsquellen

## Zielbild

- Phase F bleibt ein kleiner Post-E-Layer auf bestehender Repo-Wahrheit.
- Bestehende Tech-IDs, Lane-Strings, Actions und Stores bleiben erhalten.
- Unlock-Quellen werden additiv an DNA, Infrastruktur, Pattern, Defense und Expansion angebunden.
- Stage-Progression passt zum Rework statt zu Altmetriken.
- Objectives, Win und Lose spiegeln den neuen Run sauber.
- UI / Advisor / Read-Model bleiben eine Wahrheit.
- Phase F bleibt begrenzt und eroeffnet keinen neuen Content-Berg.

## Harte Reihenfolge

1. Phase E vollstaendig und stabil mergen.
2. Phase F nur auf stabiler E-Basis starten.
3. `tests/test-phase-f-progression-integrity.mjs` ist Pflicht-Gate vor Phase-G-Start.

## Ticket-Reihenfolge

### F1 Tech-Tree-Vertrag
- [ ] bestehende `TECH_TREE`-IDs behalten
- [ ] bestehende Lane-Strings behalten
- [ ] additive `runRequirements` pro Tech einfuehren
- [ ] `BUY_EVOLUTION` als einzigen Kaufpfad behalten
- [ ] Tests + Doku aktualisieren

### F2 Unlock-Quellen
- [ ] DNA anbinden
- [ ] Infrastruktur anbinden
- [ ] Pattern anbinden
- [ ] Defense anbinden
- [ ] Expansion anbinden
- [ ] kein zweiter Unlock-Resolver
- [ ] kein zweiter Unlock-Store
- [ ] Tests + Doku aktualisieren

### F3 Stage-Rework
- [ ] `deriveStageState()` bleibt alleinige Stage-Autoritaet
- [ ] bestehende Gewichte bleiben
- [ ] neue Gates
- [ ] monotone Stage-Progression
- [ ] Pattern beeinflussen Progression nur ueber `stabilityScore`
- [ ] Tests + Doku aktualisieren

### F4 Objectives / Win / Lose
- [ ] preset-spezifische Ziele
- [ ] Kernkollaps-Lose
- [ ] Sichtbruch-Lose
- [ ] Netzzerfall-Lose
- [ ] `goal` bleibt aktiver Zielcode
- [ ] `winMode` traegt result-only Loss-Ursache
- [ ] `applyWinConditions()` bleibt alleiniger Result-Resolver
- [ ] Tests + Doku aktualisieren

### F5 UI / Advisor
- [ ] gleiche Sprache im ganzen Spiel
- [ ] Pattern-/Zone-/Result-Summaries in bestehende Read-Model-Slots einfuegen
- [ ] keine zweite JSON-Ansicht
- [ ] keine zweite strategische Wahrheit
- [ ] Tests + Doku aktualisieren

### F6 Post-F-Integritaetstest
- [ ] `tests/test-phase-f-progression-integrity.mjs` anlegen
- [ ] in `truth`-Suite aufnehmen

### F7 Finalisierung
- [ ] `progress.md` aktualisieren
- [ ] `docs/MASTER_CHANGE_LOG.md` aktualisieren
- [ ] `docs/SESSION_HANDOFF.md` nachziehen
- [ ] Scope-Check: kein neuer Content-Berg

## Pflicht-Gate Nach Phase F

- Datei: `tests/test-phase-f-progression-integrity.mjs`
- Suite: `truth`
- Pflichtbeweise:
  - gleiche Unlock-Inputs => identische Progression
  - `playerStage` bleibt monoton
  - neue Unlock-Quellen schlagen durch, Altmetriken alleine nicht
  - `goal` bleibt Zielcode, `winMode` traegt nur Result-Ursache
  - Objectives/Win/Lose bleiben deterministisch reproduzierbar

## Harte Nicht-Ziele

- kein neuer Content-Berg
- keine neue Waehrung
- kein zweiter Tech-Tree
- kein zweiter Unlock-Resolver
- kein zweites Objective-System
- keine neue Action-Familie
- keine neue CPU-Architektur
- kein Renderer-Grundumbau
- keine Preset-Explosion
